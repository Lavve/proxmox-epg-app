import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";
import { fetchSettings } from "../api/settings";
import {
	createDisplayFormatters,
	DEFAULT_DATE_FORMAT,
	DEFAULT_TIME_FORMAT,
} from "../utils/displayFormat";
import { DisplayFormatContext } from "./displayFormatContext";

export function DisplayFormatProvider({ children }: { children: ReactNode }) {
	const settingsQuery = useQuery({
		queryKey: ["settings"],
		queryFn: fetchSettings,
	});

	const formatters = useMemo(
		() =>
			createDisplayFormatters({
				timeFormat: settingsQuery.data?.time_format ?? DEFAULT_TIME_FORMAT,
				dateFormat: settingsQuery.data?.date_format ?? DEFAULT_DATE_FORMAT,
			}),
		[settingsQuery.data?.time_format, settingsQuery.data?.date_format],
	);

	return (
		<DisplayFormatContext.Provider value={formatters}>
			{children}
		</DisplayFormatContext.Provider>
	);
}
