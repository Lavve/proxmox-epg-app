export interface GuideTimeWindow {
	startUnix: number;
	endUnix: number;
}

export function getGuideTimeWindow(hoursAhead = 12): GuideTimeWindow {
	const now = new Date();
	const start = new Date(now);
	start.setMinutes(0, 0, 0);

	const end = new Date(start);
	end.setHours(end.getHours() + hoursAhead);

	return {
		startUnix: Math.floor(start.getTime() / 1000),
		endUnix: Math.floor(end.getTime() / 1000),
	};
}

export function formatDurationMinutes(
	startUnix: number,
	endUnix: number,
): number {
	return Math.max(1, Math.round((endUnix - startUnix) / 60));
}
