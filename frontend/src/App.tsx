import { Box, Container, CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import AppHeader from "./components/AppHeader";
import ChannelAdmin from "./components/ChannelAdmin";
import TabPanel from "./components/TabPanel";
import TvGuide from "./components/TvGuide";
import { ColorModeProvider, useColorMode } from "./context/ColorModeProvider";
import { createAppTheme } from "./theme/theme";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: 1,
		},
	},
});

function AppContent() {
	const { mode } = useColorMode();
	const theme = useMemo(() => createAppTheme(mode), [mode]);
	const [activeTab, setActiveTab] = useState(0);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
				<AppHeader activeTab={activeTab} onTabChange={setActiveTab} />
				<Container
					maxWidth={false}
					disableGutters
					sx={{ flex: 1, minHeight: 0, display: "flex" }}
				>
					<TabPanel value={activeTab} index={0}>
						<TvGuide />
					</TabPanel>
					<TabPanel value={activeTab} index={1}>
						<ChannelAdmin />
					</TabPanel>
				</Container>
			</Box>
		</ThemeProvider>
	);
}

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ColorModeProvider>
				<AppContent />
			</ColorModeProvider>
		</QueryClientProvider>
	);
}
