import { Router } from "express";
import { getDb } from "../database/db";
import {
	DATE_FORMATS,
	getAppSettings,
	SETTING_KEYS,
	setSetting,
	TIME_FORMATS,
} from "../database/settingsStore";
import type { Settings, UpdateSettingsBody } from "../types/api";
import { handleRouteError, logRequest, sendError } from "../utils/http";

const router = Router();

function toSettingsResponse(
	settings: Awaited<ReturnType<typeof getAppSettings>>,
): Settings {
	return {
		epg_url: settings.epg_url,
		epg_data_valid: settings.epg_data_valid,
		epg_last_source: settings.epg_last_source,
		time_format: settings.time_format,
		date_format: settings.date_format,
	};
}

router.get("/settings", async (req, res) => {
	try {
		const db = getDb();
		const settings = toSettingsResponse(await getAppSettings(db));

		logRequest(
			req,
			`returning epg_url=${settings.epg_url ? "configured" : "empty"}, valid=${settings.epg_data_valid}`,
		);
		res.json(settings);
	} catch (error: unknown) {
		handleRouteError(res, "GET /api/settings failed", error);
	}
});

router.post("/settings", async (req, res) => {
	try {
		const body = req.body as UpdateSettingsBody;
		const hasEpgUrl = body.epg_url !== undefined;
		const hasTimeFormat = body.time_format !== undefined;
		const hasDateFormat = body.date_format !== undefined;

		if (!hasEpgUrl && !hasTimeFormat && !hasDateFormat) {
			sendError(
				res,
				400,
				"Request body must include at least one of: epg_url, time_format, date_format",
			);
			return;
		}

		const db = getDb();

		if (hasEpgUrl) {
			const epgUrl = body.epg_url?.trim();
			if (!epgUrl) {
				sendError(res, 400, "epg_url must be a non-empty string");
				return;
			}
			try {
				new URL(epgUrl);
			} catch {
				sendError(res, 400, "epg_url must be a valid URL");
				return;
			}
			await setSetting(db, SETTING_KEYS.EPG_URL, epgUrl);
		}

		if (hasTimeFormat) {
			if (
				!body.time_format ||
				!(TIME_FORMATS as readonly string[]).includes(body.time_format)
			) {
				sendError(res, 400, "time_format must be one of: 12h, 24h");
				return;
			}
			await setSetting(db, SETTING_KEYS.TIME_FORMAT, body.time_format);
		}

		if (hasDateFormat) {
			if (
				!body.date_format ||
				!(DATE_FORMATS as readonly string[]).includes(body.date_format)
			) {
				sendError(res, 400, "date_format must be one of: short, medium");
				return;
			}
			await setSetting(db, SETTING_KEYS.DATE_FORMAT, body.date_format);
		}

		const settings = toSettingsResponse(await getAppSettings(db));
		logRequest(req, "updated settings");
		res.json(settings);
	} catch (error: unknown) {
		handleRouteError(res, "POST /api/settings failed", error);
	}
});

export default router;
