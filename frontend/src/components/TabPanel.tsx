import { Box } from "@mui/material";
import type { ReactNode } from "react";

interface TabPanelProps {
	children: ReactNode;
	value: number;
	index: number;
}

export default function TabPanel({ children, value, index }: TabPanelProps) {
	if (value !== index) {
		return null;
	}

	return (
		<Box role="tabpanel" sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
			{children}
		</Box>
	);
}
