import type { Channel, UpdateChannelBody } from "../types/api";
import { apiRequest } from "./client";

export function fetchChannels(): Promise<Channel[]> {
	return apiRequest<Channel[]>("/api/channels");
}

export function updateChannel(
	id: string,
	body: UpdateChannelBody,
): Promise<Channel> {
	return apiRequest<Channel>(`/api/channels/${encodeURIComponent(id)}`, {
		method: "PATCH",
		body: JSON.stringify(body),
	});
}
