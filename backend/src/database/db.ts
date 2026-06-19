import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "epg.db");

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    is_favorite INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    category TEXT,
    FOREIGN KEY (channel_id) REFERENCES channels(id)
  );

  CREATE INDEX IF NOT EXISTS idx_programs_time ON programs(start_time, end_time);
  CREATE INDEX IF NOT EXISTS idx_programs_channel ON programs(channel_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

function isSeedableEnvUrl(value: string | undefined): value is string {
	const trimmed = value?.trim();
	if (!trimmed || trimmed === "null" || trimmed === "undefined") {
		return false;
	}
	return true;
}

async function seedDefaultSettings(db: Database): Promise<void> {
	const envUrl = process.env.EPG_SOURCE_URL;
	if (!isSeedableEnvUrl(envUrl)) {
		return;
	}

	await db.run(
		"INSERT INTO settings (key, value) VALUES ('epg_url', ?) ON CONFLICT(key) DO NOTHING",
		[envUrl],
	);
}

function resolveDbPath(): string {
	return process.env.DB_PATH ?? DEFAULT_DB_PATH;
}

function ensureDbDirectory(dbPath: string): void {
	const directory = path.dirname(dbPath);
	if (!fs.existsSync(directory)) {
		fs.mkdirSync(directory, { recursive: true });
	}
}

function openSqliteDatabase(dbPath: string): Promise<sqlite3.Database> {
	return new Promise((resolve, reject) => {
		const db = new sqlite3.Database(dbPath, (error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(db);
		});
	});
}

function execSql(db: sqlite3.Database, sql: string): Promise<void> {
	return new Promise((resolve, reject) => {
		db.exec(sql, (error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}

function closeSqliteDatabase(db: sqlite3.Database): Promise<void> {
	return new Promise((resolve, reject) => {
		db.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}

export class Database {
	private readonly db: sqlite3.Database;

	private constructor(db: sqlite3.Database) {
		this.db = db;
	}

	static async open(dbPath: string): Promise<Database> {
		ensureDbDirectory(dbPath);
		const db = await openSqliteDatabase(dbPath);
		const wrapper = new Database(db);
		await wrapper.exec(SCHEMA_SQL);
		await seedDefaultSettings(wrapper);
		return wrapper;
	}

	exec(sql: string): Promise<void> {
		return execSql(this.db, sql);
	}

	run(sql: string, params: unknown[] = []): Promise<sqlite3.RunResult> {
		return new Promise((resolve, reject) => {
			this.db.run(
				sql,
				params,
				function onRun(this: sqlite3.RunResult, error: Error | null) {
					if (error) {
						reject(error);
						return;
					}
					resolve(this);
				},
			);
		});
	}

	all<T = Record<string, unknown>>(
		sql: string,
		params: unknown[] = [],
	): Promise<T[]> {
		return new Promise((resolve, reject) => {
			this.db.all(sql, params, (error, rows) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(rows as T[]);
			});
		});
	}

	get<T = Record<string, unknown>>(
		sql: string,
		params: unknown[] = [],
	): Promise<T | undefined> {
		return new Promise((resolve, reject) => {
			this.db.get(sql, params, (error, row) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(row as T | undefined);
			});
		});
	}

	async transaction<T>(
		callback: (database: Database) => Promise<T>,
	): Promise<T> {
		await this.exec("BEGIN");
		try {
			const result = await callback(this);
			await this.exec("COMMIT");
			return result;
		} catch (error) {
			await this.exec("ROLLBACK");
			throw error;
		}
	}

	close(): Promise<void> {
		return closeSqliteDatabase(this.db);
	}
}

let dbInstance: Database | null = null;

export async function initDatabase(dbPath?: string): Promise<Database> {
	const resolvedPath = dbPath ?? resolveDbPath();
	dbInstance = await Database.open(resolvedPath);
	return dbInstance;
}

export function getDb(): Database {
	if (!dbInstance) {
		throw new Error("Database not initialized. Call initDatabase() first.");
	}
	return dbInstance;
}

export async function closeDatabase(): Promise<void> {
	if (dbInstance) {
		await dbInstance.close();
		dbInstance = null;
	}
}
