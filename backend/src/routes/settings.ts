import { Router } from "express";
import { getDb } from "../database/db";
import type { Settings, UpdateSettingsBody } from "../types/api";
import { handleRouteError, logRequest, sendError } from "../utils/http";

const EPG_URL_KEY = "epg_url";

interface SettingRow {
	value: string;
}

const router = Router();

router.get("/settings", async (req, res) => {
	try {
		const db = getDb();
		const row = await db.get<SettingRow>(
			"SELECT value FROM settings WHERE key = ?",
			[EPG_URL_KEY],
		);

		const settings: Settings = {
			epg_url: row?.value ?? null,
		};

		logRequest(
			req,
			`returning epg_url=${settings.epg_url ? "configured" : "empty"}`,
		);
		res.json(settings);
	} catch (error: unknown) {
		handleRouteError(res, "GET /api/settings failed", error);
	}
});

router.post("/settings", async (req, res) => {
	try {
		const body = req.body as UpdateSettingsBody;
		const epgUrl = body.epg_url?.trim();

		if (!epgUrl) {
			sendError(res, 400, "Request body must include a non-empty epg_url");
			return;
		}

		try {
			new URL(epgUrl);
		} catch {
			sendError(res, 400, "epg_url must be a valid URL");
			return;
		}

		const db = getDb();
		await db.run(
			"INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
			[EPG_URL_KEY, epgUrl],
		);

		const settings: Settings = { epg_url: epgUrl };

		logRequest(req, "updated epg_url");
		res.json(settings);
	} catch (error: unknown) {
		handleRouteError(res, "POST /api/settings failed", error);
	}
});

export default router;
