import type { Program } from "../types/api";
import { apiRequest } from "./client";

export interface FetchProgramsParams {
	start?: number;
	end?: number;
}

export function fetchPrograms(
	params: FetchProgramsParams = {},
): Promise<Program[]> {
	const searchParams = new URLSearchParams();

	if (params.start != null) {
		searchParams.set("start", String(params.start));
	}

	if (params.end != null) {
		searchParams.set("end", String(params.end));
	}

	const query = searchParams.toString();
	const path = query ? `/api/programs?${query}` : "/api/programs";

	return apiRequest<Program[]>(path);
}
