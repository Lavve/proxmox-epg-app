import LiveTvIcon from "@mui/icons-material/LiveTv";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import { AppBar, Tab, Tabs, Toolbar, Typography } from "@mui/material";

interface AppHeaderProps {
	activeTab: number;
	onTabChange: (nextTab: number) => void;
}

export default function AppHeader({ activeTab, onTabChange }: AppHeaderProps) {
	return (
		<AppBar position="static" color="default">
			<Toolbar variant="dense" sx={{ justifyContent: "center" }}>
				<LiveTvIcon sx={{ mr: 1, fontSize: 20 }} />
				<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
					Proxmox EPG
				</Typography>
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
					label="Channels"
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
