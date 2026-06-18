import type { ApiErrorResponse } from "../types/api";
import { getApiBaseUrl } from "./config";

export class ApiError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

async function parseError(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as ApiErrorResponse;
		return body.error ?? response.statusText;
	} catch {
		return response.statusText;
	}
}

export async function apiRequest<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(`${getApiBaseUrl()}${path}`, {
		headers: {
			Accept: "application/json",
			...(init?.body ? { "Content-Type": "application/json" } : {}),
			...init?.headers,
		},
		...init,
	});

	if (!response.ok) {
		throw new ApiError(response.status, await parseError(response));
	}

	return (await response.json()) as T;
}
