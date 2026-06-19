import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Container,
	FormControl,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchHealth, triggerEpgParse } from "../api/admin";
import { fetchSettings, updateSettings } from "../api/settings";
import { useColorMode } from "../context/ColorModeProvider";
import type { ColorMode } from "../theme/theme";
import type {
	DateFormat,
	ParseEpgResult,
	Settings,
	TimeFormat,
} from "../types/api";
import { createDisplayFormatters } from "../utils/displayFormat";

/** Sample instant for the display-format preview (2026-06-18 15:30:00 local). */
const DISPLAY_FORMAT_PREVIEW_UNIX = 1_750_250_200;

interface SettingsFormProps {
	initialSettings: Settings;
}

function isLegacyBackend(useMock: boolean | undefined): boolean {
	return useMock === undefined;
}

function formatParseSuccessMessage(
	result: ParseEpgResult,
	epgUrl: string,
): string {
	const source =
		result.source?.trim() || epgUrl.trim() || "the configured feed";
	return `Loaded ${result.channels} channels and ${result.programs} programs from ${source}.`;
}

function SettingsForm({ initialSettings }: SettingsFormProps) {
	const queryClient = useQueryClient();
	const { mode: colorMode, toggleColorMode } = useColorMode();
	const [epgUrl, setEpgUrl] = useState(initialSettings.epg_url ?? "");
	const [timeFormat, setTimeFormat] = useState<TimeFormat>(
		initialSettings.time_format,
	);
	const [dateFormat, setDateFormat] = useState<DateFormat>(
		initialSettings.date_format,
	);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [parseMessage, setParseMessage] = useState<string | null>(null);

	const previewFormatters = useMemo(
		() => createDisplayFormatters({ timeFormat, dateFormat }),
		[timeFormat, dateFormat],
	);

	const healthQuery = useQuery({
		queryKey: ["health"],
		queryFn: fetchHealth,
		refetchInterval: 30_000,
	});

	const saveMutation = useMutation({
		mutationFn: () =>
			updateSettings({
				epg_url: epgUrl.trim(),
				time_format: timeFormat,
				date_format: dateFormat,
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			setSaveSuccess(true);
			setParseMessage(null);
		},
	});

	const parseMutation = useMutation({
		mutationFn: triggerEpgParse,
		onSuccess: (result) => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			void queryClient.invalidateQueries({ queryKey: ["channels"] });
			void queryClient.invalidateQueries({ queryKey: ["programs"] });
			setParseMessage(formatParseSuccessMessage(result, epgUrl));
		},
		onError: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			void queryClient.invalidateQueries({ queryKey: ["channels"] });
			void queryClient.invalidateQueries({ queryKey: ["programs"] });
			setParseMessage(null);
		},
	});

	return (
		<Container maxWidth="sm">
			<Stack spacing={2} sx={{ p: 1 }}>
				<Paper
					variant="outlined"
					sx={{ p: 2, display: "flex", flexDirection: "column", gap: 3 }}
				>
					<Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
						EPG Source
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Enter the URL of a compressed (.xml.gz) or plain XMLTV feed from
						open-epg.com or another provider. After saving, click Refresh EPG
						Data to download and replace the current guide.
					</Typography>

					{isLegacyBackend(healthQuery.data?.use_mock) && (
						<Alert severity="warning">
							Port 3001 is still served by an old backend process. In the
							backend folder run{" "}
							<Typography
								component="span"
								variant="body2"
								sx={{ fontFamily: "monospace" }}
							>
								pnpm dev
							</Typography>
							, which frees the port automatically, then reload this page.
						</Alert>
					)}

					{healthQuery.data?.use_mock && (
						<Alert severity="warning">
							Backend is running with USE_MOCK=true. Set USE_MOCK=false in
							backend/.env and restart the backend to fetch live data.
						</Alert>
					)}

					<Stack spacing={2}>
						<TextField
							label="EPG URL"
							size="small"
							fullWidth
							value={epgUrl}
							onChange={(event) => {
								setEpgUrl(event.target.value);
								setSaveSuccess(false);
							}}
							placeholder="https://www.open-epg.com/generate/example.xml.gz"
							slotProps={{
								htmlInput: {
									spellCheck: false,
								},
							}}
						/>

						<Box
							sx={{
								display: "flex",
								justifyContent: "flex-end",
								alignItems: "center",
								gap: 1,
								flexWrap: "wrap",
							}}
						>
							<Button
								variant="outlined"
								size="medium"
								loading={parseMutation.isPending}
								startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
								disabled={
									epgUrl.trim().length === 0 ||
									healthQuery.data?.use_mock === true
								}
								onClick={() => parseMutation.mutate()}
							>
								Refresh EPG Data
							</Button>

							{parseMessage && <Alert severity="success">{parseMessage}</Alert>}

							{parseMutation.isError && (
								<Alert severity="error" sx={{ mt: 2 }}>
									<strong>Failed to refresh EPG</strong>:<br />
									{parseMutation.error.message}
								</Alert>
							)}
						</Box>
					</Stack>
				</Paper>

				<Paper
					variant="outlined"
					sx={{ p: 2, display: "flex", flexDirection: "column", gap: 3 }}
				>
					<Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
						Display
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Choose how times and dates appear in the TV guide and program
						tooltips. Theme is saved in this browser and applies immediately.
					</Typography>

					<Stack spacing={4}>
						<FormControl size="small" fullWidth>
							<InputLabel id="theme-label">Theme</InputLabel>
							<Select
								labelId="theme-label"
								label="Theme"
								value={colorMode}
								onChange={(event) => {
									const next = event.target.value as ColorMode;
									if (next !== colorMode) {
										toggleColorMode();
									}
								}}
							>
								<MenuItem value="light">Light</MenuItem>
								<MenuItem value="dark">Dark</MenuItem>
							</Select>
						</FormControl>

						<FormControl size="small" fullWidth>
							<InputLabel id="time-format-label">Time format</InputLabel>
							<Select
								labelId="time-format-label"
								label="Time format"
								value={timeFormat}
								onChange={(event) => {
									setTimeFormat(event.target.value as TimeFormat);
									setSaveSuccess(false);
								}}
							>
								<MenuItem value="12h">12-hour (10:00 PM)</MenuItem>
								<MenuItem value="24h">24-hour (22:00)</MenuItem>
							</Select>
						</FormControl>

						<FormControl size="small" fullWidth>
							<InputLabel id="date-format-label">Date format</InputLabel>
							<Select
								labelId="date-format-label"
								label="Date format"
								value={dateFormat}
								onChange={(event) => {
									setDateFormat(event.target.value as DateFormat);
									setSaveSuccess(false);
								}}
							>
								<MenuItem value="short">Short (Mon, Jun 19)</MenuItem>
								<MenuItem value="medium">Medium (Monday, June 19)</MenuItem>
							</Select>
						</FormControl>

						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ textAlign: "right" }}
						>
							Preview:{" "}
							{previewFormatters.formatDateTime(DISPLAY_FORMAT_PREVIEW_UNIX)}
						</Typography>

						<Box
							sx={{
								display: "flex",
								justifyContent: "flex-end",
								alignItems: "center",
								gap: 1,
							}}
						>
							<Button
								variant="contained"
								size="medium"
								loading={saveMutation.isPending}
								startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
								disabled={saveMutation.isPending || epgUrl.trim().length === 0}
								onClick={() => saveMutation.mutate()}
							>
								Save Settings
							</Button>
						</Box>

						{saveSuccess && !saveMutation.isError && (
							<Typography
								variant="body2"
								color="success.main"
								sx={{ textAlign: "right" }}
							>
								Settings saved.
							</Typography>
						)}

						{saveMutation.isError && (
							<Alert severity="error">
								Failed to save settings: {saveMutation.error.message}
							</Alert>
						)}
					</Stack>
				</Paper>
			</Stack>
		</Container>
	);
}

export default function SettingsView() {
	const settingsQuery = useQuery({
		queryKey: ["settings"],
		queryFn: fetchSettings,
	});

	if (settingsQuery.isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress size={24} />
			</Box>
		);
	}

	if (settingsQuery.isError) {
		return (
			<Alert severity="error" sx={{ m: 1 }}>
				Failed to load settings: {settingsQuery.error.message}
			</Alert>
		);
	}

	if (!settingsQuery.data) {
		return (
			<Alert severity="error" sx={{ m: 1 }}>
				Failed to load settings: no data returned
			</Alert>
		);
	}

	const normalizedSettings: Settings = {
		...settingsQuery.data,
		time_format: settingsQuery.data.time_format ?? "12h",
		date_format: settingsQuery.data.date_format ?? "short",
	};
	const formKey = `${normalizedSettings.epg_url ?? ""}-${normalizedSettings.time_format}-${normalizedSettings.date_format}`;

	return <SettingsForm key={formKey} initialSettings={normalizedSettings} />;
}
