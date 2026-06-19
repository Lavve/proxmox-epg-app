import type { DateFormat, TimeFormat } from "../types/api";
import type { Database } from "./db";

export const SETTING_KEYS = {
	EPG_URL: "epg_url",
	EPG_DATA_VALID: "epg_data_valid",
	EPG_LAST_SOURCE: "epg_last_source",
	TIME_FORMAT: "time_format",
	DATE_FORMAT: "date_format",
} as const;

export const MOCK_EPG_SOURCE = "mock-epg-generator";

export const TIME_FORMATS = ["12h", "24h"] as const;
export const DATE_FORMATS = ["short", "medium"] as const;

const DEFAULT_TIME_FORMAT: TimeFormat = "12h";
const DEFAULT_DATE_FORMAT: DateFormat = "short";

const MOCK_CHANNEL_IDS = new Set(["bbc-one.uk", "ard.de", "zdf.de"]);

export interface AppSettings {
	epg_url: string | null;
	epg_data_valid: boolean;
	epg_last_source: string | null;
	time_format: TimeFormat;
	date_format: DateFormat;
}

function parseTimeFormat(value: string | null): TimeFormat {
	return value === "24h" ? "24h" : DEFAULT_TIME_FORMAT;
}

function parseDateFormat(value: string | null): DateFormat {
	return value === "medium" ? "medium" : DEFAULT_DATE_FORMAT;
}

export async function getSetting(
	db: Database,
	key: string,
): Promise<string | null> {
	const row = await db.get<{ value: string }>(
		"SELECT value FROM settings WHERE key = ?",
		[key],
	);
	return row?.value ?? null;
}

export async function setSetting(
	db: Database,
	key: string,
	value: string,
): Promise<void> {
	await db.run(
		"INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
		[key, value],
	);
}

export async function getAppSettings(db: Database): Promise<AppSettings> {
	const [epgUrl, epgDataValid, epgLastSource, timeFormat, dateFormat] =
		await Promise.all([
			getSetting(db, SETTING_KEYS.EPG_URL),
			getSetting(db, SETTING_KEYS.EPG_DATA_VALID),
			getSetting(db, SETTING_KEYS.EPG_LAST_SOURCE),
			getSetting(db, SETTING_KEYS.TIME_FORMAT),
			getSetting(db, SETTING_KEYS.DATE_FORMAT),
		]);

	return {
		epg_url: epgUrl,
		epg_data_valid: epgDataValid === "true",
		epg_last_source: epgLastSource,
		time_format: parseTimeFormat(timeFormat),
		date_format: parseDateFormat(dateFormat),
	};
}

export async function clearEpgData(db: Database): Promise<void> {
	await db.exec("DELETE FROM programs");
	await db.exec("DELETE FROM channels");
}

export async function saveEpgMetadata(
	db: Database,
	metadata: { valid: boolean; source: string | null },
): Promise<void> {
	await setSetting(
		db,
		SETTING_KEYS.EPG_DATA_VALID,
		metadata.valid ? "true" : "false",
	);
	await setSetting(db, SETTING_KEYS.EPG_LAST_SOURCE, metadata.source ?? "");
}

async function hasLegacyMockChannels(db: Database): Promise<boolean> {
	const rows = await db.all<{ id: string }>("SELECT id FROM channels");
	return rows.some((row) => MOCK_CHANNEL_IDS.has(row.id));
}

export async function invalidateStaleEpgDataOnStartup(
	db: Database,
	useMock: boolean,
): Promise<void> {
	if (useMock) {
		return;
	}

	const validSetting = await getSetting(db, SETTING_KEYS.EPG_DATA_VALID);
	const source = await getSetting(db, SETTING_KEYS.EPG_LAST_SOURCE);

	const shouldClear =
		source === MOCK_EPG_SOURCE ||
		validSetting === "false" ||
		(validSetting === null && (await hasLegacyMockChannels(db)));

	if (!shouldClear) {
		return;
	}

	await clearEpgData(db);
	await saveEpgMetadata(db, { valid: false, source: null });
	console.log(
		"Cleared stale or mock EPG data (live mode requires a successful open-epg fetch).",
	);
}
