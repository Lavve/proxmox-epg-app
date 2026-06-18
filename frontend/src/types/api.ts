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
