import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import {
	AppBar,
	IconButton,
	Tab,
	Tabs,
	Toolbar,
	Tooltip,
	Typography,
} from "@mui/material";

import { useColorMode } from "../context/ColorModeProvider";

interface AppHeaderProps {
	activeTab: number;
	onTabChange: (nextTab: number) => void;
}

export default function AppHeader({ activeTab, onTabChange }: AppHeaderProps) {
	const { mode, toggleColorMode } = useColorMode();
	const isDarkMode = mode === "dark";

	return (
		<AppBar position="static" color="default">
			<Toolbar variant="dense">
				<LiveTvIcon sx={{ mr: 1, fontSize: 20 }} />
				<Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
					Proxmox EPG
				</Typography>
				<Tooltip
					title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
				>
					<IconButton
						onClick={toggleColorMode}
						aria-label={
							isDarkMode ? "Switch to light mode" : "Switch to dark mode"
						}
						edge="end"
					>
						{isDarkMode ? (
							<LightModeIcon sx={{ fontSize: 18 }} />
						) : (
							<DarkModeIcon sx={{ fontSize: 18 }} />
						)}
					</IconButton>
				</Tooltip>
			</Toolbar>
			<Tabs
				value={activeTab}
				onChange={(_event, nextValue: number) => onTabChange(nextValue)}
				variant="fullWidth"
			>
				<Tab
					icon={<LiveTvIcon sx={{ fontSize: 16 }} />}
					iconPosition="start"
					label="TV Guide"
				/>
				<Tab
					icon={<SettingsInputAntennaIcon sx={{ fontSize: 16 }} />}
					iconPosition="start"
					label="Channel Admin"
				/>
				<Tab
					icon={<SettingsIcon sx={{ fontSize: 16 }} />}
					iconPosition="start"
					label="Settings"
				/>
			</Tabs>
		</AppBar>
	);
}
