export interface Channel {
	id: string;
	name: string;
	icon: string | null;
	is_enabled: boolean;
	is_favorite: boolean;
}

export interface UpdateChannelBody {
	is_enabled?: boolean;
	is_favorite?: boolean;
}

export interface ProgramChannelInfo {
	name: string;
	icon: string | null;
}

export interface Program {
	id: number;
	channel_id: string;
	title: string;
	description: string | null;
	start_time: number;
	end_time: number;
	category: string | null;
	channel: ProgramChannelInfo;
}

export interface ApiErrorResponse {
	error: string;
}

export type TimeFormat = "12h" | "24h";
export type DateFormat = "short" | "medium";

export interface Settings {
	epg_url: string | null;
	epg_data_valid: boolean;
	epg_last_source: string | null;
	time_format: TimeFormat;
	date_format: DateFormat;
}

export interface UpdateSettingsBody {
	epg_url?: string;
	time_format?: TimeFormat;
	date_format?: DateFormat;
}

export interface HealthResponse {
	status: string;
	use_mock?: boolean;
	pid?: number;
}

export interface ParseEpgResult {
	channels: number;
	programs: number;
	durationMs: number;
	source?: string;
}
