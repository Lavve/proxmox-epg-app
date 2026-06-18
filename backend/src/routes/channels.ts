import { Router } from "express";
import { getDb } from "../database/db";
import type { Channel, UpdateChannelBody } from "../types/api";
import { handleRouteError, logRequest, sendError } from "../utils/http";

interface ChannelRow {
	id: string;
	name: string;
	icon: string | null;
	is_enabled: number;
	is_favorite: number;
}

function toChannel(row: ChannelRow): Channel {
	return {
		id: row.id,
		name: row.name,
		icon: row.icon,
		is_enabled: row.is_enabled === 1,
		is_favorite: row.is_favorite === 1,
	};
}

const router = Router();

router.get("/", async (req, res) => {
	try {
		const db = getDb();
		const rows = await db.all<ChannelRow>(
			"SELECT id, name, icon, is_enabled, is_favorite FROM channels ORDER BY name ASC",
		);
		const channels = rows.map(toChannel);

		logRequest(req, `returning ${channels.length} channels`);
		res.json(channels);
	} catch (error: unknown) {
		handleRouteError(res, "GET /api/channels failed", error);
	}
});

router.patch("/:id", async (req, res) => {
	const channelId = req.params.id;

	try {
		const body = req.body as UpdateChannelBody;
		const updates: string[] = [];
		const params: unknown[] = [];

		if (typeof body.is_enabled === "boolean") {
			updates.push("is_enabled = ?");
			params.push(body.is_enabled ? 1 : 0);
		}

		if (typeof body.is_favorite === "boolean") {
			updates.push("is_favorite = ?");
			params.push(body.is_favorite ? 1 : 0);
		}

		if (updates.length === 0) {
			sendError(
				res,
				400,
				"Request body must include at least one of: is_enabled, is_favorite",
			);
			return;
		}

		const db = getDb();
		const existing = await db.get<ChannelRow>(
			"SELECT id, name, icon, is_enabled, is_favorite FROM channels WHERE id = ?",
			[channelId],
		);

		if (!existing) {
			logRequest(req, `channel not found: ${channelId}`);
			sendError(res, 404, `Channel not found: ${channelId}`);
			return;
		}

		params.push(channelId);
		await db.run(
			`UPDATE channels SET ${updates.join(", ")} WHERE id = ?`,
			params,
		);

		const updated = await db.get<ChannelRow>(
			"SELECT id, name, icon, is_enabled, is_favorite FROM channels WHERE id = ?",
			[channelId],
		);

		if (!updated) {
			sendError(res, 500, "Channel update failed");
			return;
		}

		logRequest(req, `updated channel ${channelId}`);
		res.json(toChannel(updated));
	} catch (error: unknown) {
		handleRouteError(res, `PATCH /api/channels/${channelId} failed`, error);
	}
});

export default router;
