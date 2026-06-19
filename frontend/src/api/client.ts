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
	const url = `${getApiBaseUrl()}${path}`;
	const response = await fetch(url, {
		headers: {
			Accept: "application/json",
			...(init?.body ? { "Content-Type": "application/json" } : {}),
			...init?.headers,
		},
		...init,
	});

	if (!response.ok) {
		const detail = await parseError(response);
		const message =
			response.status === 404
				? `${detail} (${url}) — is the backend running with the latest code?`
				: detail;
		throw new ApiError(response.status, message);
	}

	return (await response.json()) as T;
}
