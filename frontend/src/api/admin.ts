import type { HealthResponse, ParseEpgResult } from "../types/api";
import { apiRequest } from "./client";

export function fetchHealth(): Promise<HealthResponse> {
	return apiRequest<HealthResponse>("/health");
}

export function triggerEpgParse(): Promise<ParseEpgResult> {
	return apiRequest<ParseEpgResult>("/api/admin/parse");
}
