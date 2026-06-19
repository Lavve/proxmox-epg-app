import type { Settings, UpdateSettingsBody } from "../types/api";
import { apiRequest } from "./client";

export function fetchSettings(): Promise<Settings> {
	return apiRequest<Settings>("/api/settings");
}

export function updateSettings(body: UpdateSettingsBody): Promise<Settings> {
	return apiRequest<Settings>("/api/settings", {
		method: "POST",
		body: JSON.stringify(body),
	});
}
