import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { XMLParser } from "fast-xml-parser";
import type { Database } from "../database/db";
import { getDb } from "../database/db";

const INSERT_BATCH_SIZE = 150;
const MOCK_EPG_PATH = path.join(process.cwd(), "mock-epg.xml");

interface ParsedChannel {
	id: string;
	name: string;
	icon: string | null;
}

interface ParsedProgram {
	channelId: string;
	title: string;
	description: string | null;
	startTime: number;
	endTime: number;
	category: string | null;
}

export interface ParseEpgResult {
	channels: number;
	programs: number;
	durationMs: number;
}

function normalizeToArray<T>(value: T | T[] | undefined): T[] {
	if (value == null) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

function extractText(value: unknown): string | null {
	if (value == null) {
		return null;
	}
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return extractText(value[0]);
	}
	if (typeof value === "object") {
		const record = value as Record<string, unknown>;
		if ("#text" in record) {
			return extractText(record["#text"]);
		}
	}
	return null;
}

/**
 * Parses XMLTV datetime strings such as "20260618200000 +0200" into Unix seconds (UTC).
 */
export function parseXmltvDateTime(value: string): number {
	const trimmed = value.trim();
	const match = trimmed.match(
		/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{4}))?$/,
	);

	if (!match) {
		throw new Error(`Invalid XMLTV datetime: ${value}`);
	}

	const [, year, month, day, hour, minute, second, timezone] = match;
	const utcMs = Date.UTC(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
		Number(second),
	);

	if (!timezone) {
		return Math.floor(utcMs / 1000);
	}

	const sign = timezone.startsWith("+") ? 1 : -1;
	const offsetHours = Number(timezone.slice(1, 3));
	const offsetMinutes = Number(timezone.slice(3, 5));
	const offsetSeconds = sign * (offsetHours * 3600 + offsetMinutes * 60);

	return Math.floor((utcMs - offsetSeconds * 1000) / 1000);
}

function parseChannels(rawChannels: unknown): ParsedChannel[] {
	return normalizeToArray(rawChannels as Record<string, unknown>[])
		.map((channel) => {
			const id = channel["@_id"];
			if (typeof id !== "string" || id.length === 0) {
				return null;
			}

			const name = extractText(channel["display-name"]);
			if (!name) {
				return null;
			}

			const icons = normalizeToArray(
				channel.icon as Record<string, unknown> | Record<string, unknown>[],
			);
			const iconRecord = icons[0];
			const icon =
				iconRecord && typeof iconRecord["@_src"] === "string"
					? iconRecord["@_src"]
					: null;

			return { id, name, icon };
		})
		.filter((channel): channel is ParsedChannel => channel !== null);
}

function parsePrograms(rawPrograms: unknown): ParsedProgram[] {
	return normalizeToArray(rawPrograms as Record<string, unknown>[])
		.map((program) => {
			const channelId = program["@_channel"];
			const start = program["@_start"];
			const stop = program["@_stop"];
			const title = extractText(program.title);

			if (
				typeof channelId !== "string" ||
				typeof start !== "string" ||
				typeof stop !== "string" ||
				!title
			) {
				return null;
			}

			const categories = normalizeToArray(program.category);
			const category = extractText(categories[0]);

			return {
				channelId,
				title,
				description: extractText(program.desc),
				startTime: parseXmltvDateTime(start),
				endTime: parseXmltvDateTime(stop),
				category,
			};
		})
		.filter((program): program is ParsedProgram => program !== null);
}

async function upsertChannels(
	db: Database,
	channels: ParsedChannel[],
): Promise<void> {
	const sql = `
    INSERT INTO channels (id, name, icon, is_enabled, is_favorite)
    VALUES (?, ?, ?, 1, 0)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      icon = excluded.icon
  `;

	for (const channel of channels) {
		await db.run(sql, [channel.id, channel.name, channel.icon]);
	}
}

async function replacePrograms(
	db: Database,
	programs: ParsedProgram[],
): Promise<void> {
	await db.exec("DELETE FROM programs");

	if (programs.length === 0) {
		return;
	}

	const insertPrefix =
		"INSERT INTO programs (channel_id, title, description, start_time, end_time, category) VALUES ";

	for (let index = 0; index < programs.length; index += INSERT_BATCH_SIZE) {
		const batch = programs.slice(index, index + INSERT_BATCH_SIZE);
		const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
		const params = batch.flatMap((program) => [
			program.channelId,
			program.title,
			program.description,
			program.startTime,
			program.endTime,
			program.category,
		]);

		await db.run(`${insertPrefix}${placeholders}`, params);
	}
}

async function downloadAndDecompress(url: string): Promise<string> {
	const response = await fetch(url, { redirect: "follow" });
	if (!response.ok) {
		throw new Error(
			`Failed to fetch EPG source (${response.status} ${response.statusText})`,
		);
	}

	const compressed = Buffer.from(await response.arrayBuffer());
	if (compressed.length === 0) {
		throw new Error("EPG source returned an empty response");
	}

	try {
		return gunzipSync(compressed).toString("utf-8");
	} catch {
		const asText = compressed.toString("utf-8").trimStart();
		if (asText.startsWith("<?xml") || asText.startsWith("<tv")) {
			return asText;
		}
		throw new Error(
			"Failed to decompress EPG source: response is not valid gzip or XML",
		);
	}
}

function shouldUseMockEpg(sourceUrl?: string): boolean {
	if (process.env.USE_MOCK === "true") {
		return true;
	}

	const url = sourceUrl ?? process.env.EPG_SOURCE_URL;
	return !url || url.trim().length === 0;
}

function readMockEpg(): string {
	if (!fs.existsSync(MOCK_EPG_PATH)) {
		throw new Error(`Mock EPG file not found: ${MOCK_EPG_PATH}`);
	}

	return fs.readFileSync(MOCK_EPG_PATH, "utf-8");
}

async function loadEpgXml(
	sourceUrl?: string,
): Promise<{ xml: string; source: string }> {
	if (shouldUseMockEpg(sourceUrl)) {
		return { xml: readMockEpg(), source: MOCK_EPG_PATH };
	}

	const url = sourceUrl ?? process.env.EPG_SOURCE_URL;
	if (!url) {
		throw new Error("EPG_SOURCE_URL is not configured");
	}

	return { xml: await downloadAndDecompress(url), source: url };
}

function parseXmltvDocument(xml: string): {
	channels: ParsedChannel[];
	programs: ParsedProgram[];
} {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
		trimValues: true,
	});

	const document = parser.parse(xml) as Record<string, unknown>;
	const tv = (document.tv ?? document) as Record<string, unknown>;

	return {
		channels: parseChannels(tv.channel),
		programs: parsePrograms(tv.programme),
	};
}

export async function parseEpg(sourceUrl?: string): Promise<ParseEpgResult> {
	const startedAt = Date.now();
	const { xml, source } = await loadEpgXml(sourceUrl);

	console.log(`EPG parser started (source: ${source})`);

	const { channels, programs } = parseXmltvDocument(xml);
	const db = getDb();

	await db.transaction(async (database) => {
		await upsertChannels(database, channels);
		await replacePrograms(database, programs);
	});

	const durationMs = Date.now() - startedAt;
	const result: ParseEpgResult = {
		channels: channels.length,
		programs: programs.length,
		durationMs,
	};

	console.log(
		`EPG parser finished: ${result.channels} channels, ${result.programs} programs in ${result.durationMs}ms`,
	);

	return result;
}
