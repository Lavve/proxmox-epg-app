import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { initDatabase } from "./database/db";
import { parseEpg } from "./parser/epgParser";
import apiRouter from "./routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

async function startServer(): Promise<void> {
	await initDatabase();

	app.get("/health", (_req, res) => {
		res.json({ status: "ok" });
	});

	app.use("/api", apiRouter);

	app.get("/api/admin/parse", async (req, res) => {
		try {
			console.log(`${req.method} ${req.originalUrl} - triggering EPG parse`);
			const result = await parseEpg();
			res.json(result);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error("EPG parse failed:", error);
			res.status(500).json({ error: message });
		}
	});

	app.listen(PORT, () => {
		console.log(`Server running on http://localhost:${PORT}`);
	});
}

startServer().catch((error: unknown) => {
	console.error("Failed to start server:", error);
	process.exit(1);
});
