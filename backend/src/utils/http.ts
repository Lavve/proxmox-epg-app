import type { Request, Response } from "express";

export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Unknown error";
}

export function sendError(
	res: Response,
	status: number,
	message: string,
): void {
	res.status(status).json({ error: message });
}

export function handleRouteError(
	res: Response,
	context: string,
	error: unknown,
	status = 500,
): void {
	const message = getErrorMessage(error);
	console.error(`${context}:`, error);
	sendError(res, status, message);
}

export function parseOptionalTimestamp(
	value: unknown,
	fieldName: string,
): number | undefined {
	if (value == null || value === "") {
		return undefined;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(
			`Invalid ${fieldName} query parameter: must be a non-negative integer Unix timestamp`,
		);
	}

	return parsed;
}

export function logRequest(req: Request, detail: string): void {
	console.log(`${req.method} ${req.originalUrl} - ${detail}`);
}
