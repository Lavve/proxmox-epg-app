export const TIME_FORMATS = ["12h", "24h"] as const;
export const DATE_FORMATS = ["short", "medium"] as const;

export type TimeFormat = (typeof TIME_FORMATS)[number];
export type DateFormat = (typeof DATE_FORMATS)[number];

export const DEFAULT_TIME_FORMAT: TimeFormat = "12h";
export const DEFAULT_DATE_FORMAT: DateFormat = "short";

export interface DisplayFormatOptions {
	timeFormat: TimeFormat;
	dateFormat: DateFormat;
}

export interface DisplayFormatters {
	formatTime: (unixSeconds: number) => string;
	formatDateTime: (unixSeconds: number) => string;
	formatGuideRange: (startUnix: number, endUnix: number) => string;
}

export function createDisplayFormatters(
	options: DisplayFormatOptions,
): DisplayFormatters {
	const hour12 = options.timeFormat === "12h";
	const timeOptions: Intl.DateTimeFormatOptions = {
		hour: "2-digit",
		minute: "2-digit",
		hour12,
	};
	const dateOptions: Intl.DateTimeFormatOptions =
		options.dateFormat === "medium"
			? { weekday: "long", month: "long", day: "numeric" }
			: { weekday: "short", month: "short", day: "numeric" };

	const formatTime = (unixSeconds: number): string =>
		new Date(unixSeconds * 1000).toLocaleTimeString(undefined, timeOptions);

	const formatDateTime = (unixSeconds: number): string =>
		new Date(unixSeconds * 1000).toLocaleString(undefined, {
			...dateOptions,
			...timeOptions,
		});

	const formatGuideRange = (startUnix: number, endUnix: number): string => {
		const startDate = new Date(startUnix * 1000);
		const endDate = new Date(endUnix * 1000);
		if (startDate.toDateString() === endDate.toDateString()) {
			return `${formatTime(startUnix)} – ${formatTime(endUnix)}`;
		}
		return `${formatDateTime(startUnix)} – ${formatDateTime(endUnix)}`;
	};

	return { formatTime, formatDateTime, formatGuideRange };
}

export function parseTimeFormat(value: string | null | undefined): TimeFormat {
	return value === "24h" ? "24h" : DEFAULT_TIME_FORMAT;
}

export function parseDateFormat(value: string | null | undefined): DateFormat {
	return value === "medium" ? "medium" : DEFAULT_DATE_FORMAT;
}
