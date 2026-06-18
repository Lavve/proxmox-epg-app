import dotenv from "dotenv";

import { closeDatabase, initDatabase } from "../database/db";
import { parseEpg } from "../parser/epgParser";
import {
	getMockEpgSummary,
	writeMockEpgFile,
} from "../parser/mockEpgGenerator";

dotenv.config();

async function seedDatabase(): Promise<void> {
	process.env.USE_MOCK = "true";

	const mockPath = writeMockEpgFile();
	const summary = getMockEpgSummary();

	console.log(`Generated mock EPG at ${mockPath}`);
	console.log(
		`Schedule window: ${new Date(summary.window.startUnix * 1000).toISOString()} -> ${new Date(summary.window.endUnix * 1000).toISOString()}`,
	);
	console.log(
		`Prepared ${summary.channels} channels and ${summary.programs} programs`,
	);

	await initDatabase();
	const result = await parseEpg();
	console.log(
		`Database seeded: ${result.channels} channels, ${result.programs} programs in ${result.durationMs}ms`,
	);
	await closeDatabase();
}

seedDatabase().catch((error: unknown) => {
	console.error("Seed failed:", error);
	process.exit(1);
});
