import SaveIcon from "@mui/icons-material/Save";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Paper,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchSettings, updateSettings } from "../api/settings";

interface SettingsFormProps {
	initialEpgUrl: string;
}

function SettingsForm({ initialEpgUrl }: SettingsFormProps) {
	const queryClient = useQueryClient();
	const [epgUrl, setEpgUrl] = useState(initialEpgUrl);
	const [saveSuccess, setSaveSuccess] = useState(false);

	const saveMutation = useMutation({
		mutationFn: () => updateSettings({ epg_url: epgUrl.trim() }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			setSaveSuccess(true);
		},
	});

	return (
		<Box sx={{ p: 1, width: "100%", maxWidth: 720 }}>
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
					EPG Source
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Enter the URL of a compressed (.xml.gz) or plain XMLTV feed from
					open-epg.com or another provider.
				</Typography>

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

					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<Button
							variant="contained"
							size="small"
							startIcon={
								saveMutation.isPending ? (
									<CircularProgress size={14} color="inherit" />
								) : (
									<SaveIcon sx={{ fontSize: 16 }} />
								)
							}
							disabled={saveMutation.isPending || epgUrl.trim().length === 0}
							onClick={() => saveMutation.mutate()}
						>
							Save
						</Button>

						{saveSuccess && !saveMutation.isError && (
							<Typography variant="body2" color="success.main">
								Settings saved.
							</Typography>
						)}
					</Box>

					{saveMutation.isError && (
						<Alert severity="error">
							Failed to save settings: {saveMutation.error.message}
						</Alert>
					)}
				</Stack>
			</Paper>
		</Box>
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

	const initialEpgUrl = settingsQuery.data.epg_url ?? "";

	return <SettingsForm key={initialEpgUrl} initialEpgUrl={initialEpgUrl} />;
}
