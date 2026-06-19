import type { Server } from "node:http";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getDb, initDatabase } from "./database/db";
import {
	getAppSettings,
	invalidateStaleEpgDataOnStartup,
} from "./database/settingsStore";
import { isMockModeEnabled, parseEpg } from "./parser/epgParser";
import apiRouter from "./routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

function listen(appInstance: express.Application): Promise<Server> {
	return new Promise((resolve, reject) => {
		const server = appInstance.listen(PORT, () => {
			resolve(server);
		});

		server.on("error", (error: NodeJS.ErrnoException) => {
			if (error.code === "EADDRINUSE") {
				reject(
					new Error(
						`Port ${PORT} is already in use. Stop the other backend process and restart.`,
					),
				);
				return;
			}
			reject(error);
		});
	});
}

async function startServer(): Promise<void> {
	await initDatabase();
	const useMock = isMockModeEnabled();
	await invalidateStaleEpgDataOnStartup(getDb(), useMock);
	console.log(
		`EPG mode: ${useMock ? "mock (USE_MOCK=true)" : "live (fetch from Settings URL)"} [pid ${process.pid}]`,
	);

	app.get("/health", (_req, res) => {
		res.json({
			status: "ok",
			use_mock: useMock,
			pid: process.pid,
		});
	});

	app.use("/api", apiRouter);

	app.get("/api/admin/parse", async (req, res) => {
		try {
			console.log(`${req.method} ${req.originalUrl} - triggering EPG parse`);
			const result = await parseEpg();
			const metadata = await getAppSettings(getDb());
			res.json({
				...result,
				source:
					result.source ?? metadata.epg_last_source ?? metadata.epg_url ?? null,
			});
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error("EPG parse failed:", error);
			res.status(500).json({ error: message });
		}
	});

	await listen(app);
	console.log(`Server running on http://localhost:${PORT}`);
}

startServer().catch((error: unknown) => {
	console.error("Failed to start server:", error);
	process.exit(1);
});
