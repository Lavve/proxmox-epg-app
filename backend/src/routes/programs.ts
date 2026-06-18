import { Router } from "express";
import { getDb } from "../database/db";
import type { Program } from "../types/api";
import {
	handleRouteError,
	logRequest,
	parseOptionalTimestamp,
	sendError,
} from "../utils/http";

interface ProgramRow {
	id: number;
	channel_id: string;
	title: string;
	description: string | null;
	start_time: number;
	end_time: number;
	category: string | null;
	channel_name: string;
	channel_icon: string | null;
}

function toProgram(row: ProgramRow): Program {
	return {
		id: row.id,
		channel_id: row.channel_id,
		title: row.title,
		description: row.description,
		start_time: row.start_time,
		end_time: row.end_time,
		category: row.category,
		channel: {
			name: row.channel_name,
			icon: row.channel_icon,
		},
	};
}

const router = Router();

router.get("/", async (req, res) => {
	try {
		const start = parseOptionalTimestamp(req.query.start, "start");
		const end = parseOptionalTimestamp(req.query.end, "end");

		if (start != null && end != null && start > end) {
			sendError(
				res,
				400,
				"Invalid time range: start must be less than or equal to end",
			);
			return;
		}

		const conditions = ["c.is_enabled = 1"];
		const params: unknown[] = [];

		if (start != null) {
			conditions.push("p.end_time > ?");
			params.push(start);
		}

		if (end != null) {
			conditions.push("p.start_time < ?");
			params.push(end);
		}

		const sql = `
      SELECT
        p.id,
        p.channel_id,
        p.title,
        p.description,
        p.start_time,
        p.end_time,
        p.category,
        c.name AS channel_name,
        c.icon AS channel_icon
      FROM programs p
      INNER JOIN channels c ON c.id = p.channel_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.start_time ASC, c.name ASC
    `;

		const db = getDb();
		const rows = await db.all<ProgramRow>(sql, params);
		const programs = rows.map(toProgram);

		const filterDetail =
			start != null || end != null
				? `returning ${programs.length} programs (start=${start ?? "any"}, end=${end ?? "any"})`
				: `returning ${programs.length} programs`;

		logRequest(req, filterDetail);
		res.json(programs);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Unknown error";
		const status = message.startsWith("Invalid ") ? 400 : 500;
		handleRouteError(res, "GET /api/programs failed", error, status);
	}
});

export default router;
