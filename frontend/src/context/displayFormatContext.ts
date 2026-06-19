import { createContext, useContext } from "react";
import {
	createDisplayFormatters,
	DEFAULT_DATE_FORMAT,
	DEFAULT_TIME_FORMAT,
	type DisplayFormatters,
} from "../utils/displayFormat";

export const DisplayFormatContext = createContext<DisplayFormatters | null>(
	null,
);

export function useDisplayFormat(): DisplayFormatters {
	const context = useContext(DisplayFormatContext);
	if (!context) {
		return createDisplayFormatters({
			timeFormat: DEFAULT_TIME_FORMAT,
			dateFormat: DEFAULT_DATE_FORMAT,
		});
	}
	return context;
}
