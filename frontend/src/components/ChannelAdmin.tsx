import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import TvIcon from "@mui/icons-material/Tv";
import {
	Alert,
	Avatar,
	Box,
	CircularProgress,
	IconButton,
	Paper,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchChannels, updateChannel } from "../api/channels";
import type { Channel } from "../types/api";

function ChannelIcon({ channel }: { channel: Channel }) {
	if (channel.icon) {
		return (
			<Avatar
				alt={channel.name}
				src={channel.icon}
				variant="rounded"
				sx={{ width: 24, height: 24, fontSize: "0.75rem" }}
			/>
		);
	}

	return (
		<Avatar
			variant="rounded"
			sx={{ width: 24, height: 24, fontSize: "0.75rem" }}
		>
			<TvIcon sx={{ fontSize: 14 }} />
		</Avatar>
	);
}

export default function ChannelAdmin() {
	const queryClient = useQueryClient();
	const channelsQuery = useQuery({
		queryKey: ["channels"],
		queryFn: fetchChannels,
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, is_enabled }: { id: string; is_enabled: boolean }) =>
			updateChannel(id, { is_enabled }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["channels"] });
			void queryClient.invalidateQueries({ queryKey: ["programs"] });
		},
	});

	if (channelsQuery.isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress size={24} />
			</Box>
		);
	}

	if (channelsQuery.isError) {
		return (
			<Alert severity="error" sx={{ m: 1 }}>
				Failed to load channels: {channelsQuery.error.message}
			</Alert>
		);
	}

	const channels = channelsQuery.data ?? [];

	return (
		<Box sx={{ p: 1, height: "100%", boxSizing: "border-box" }}>
			<Typography
				variant="body2"
				color="text.secondary"
				sx={{ mb: 1, px: 0.5 }}
			>
				Enable or disable channels. Disabled channels are hidden from the TV
				guide.
			</Typography>

			<TableContainer
				component={Paper}
				variant="outlined"
				sx={{ maxHeight: "100%" }}
			>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow>
							<TableCell width={48} />
							<TableCell>Channel</TableCell>
							<TableCell width={100} align="center">
								Enabled
							</TableCell>
							<TableCell width={80} align="center">
								Favorite
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{channels.map((channel) => (
							<TableRow key={channel.id} hover>
								<TableCell>
									<ChannelIcon channel={channel} />
								</TableCell>
								<TableCell>
									<Typography variant="body2" noWrap>
										{channel.name}
									</Typography>
									<Typography variant="caption" color="text.secondary" noWrap>
										{channel.id}
									</Typography>
								</TableCell>
								<TableCell align="center">
									<Switch
										checked={channel.is_enabled}
										disabled={updateMutation.isPending}
										onChange={(event) => {
											updateMutation.mutate({
												id: channel.id,
												is_enabled: event.target.checked,
											});
										}}
										aria-label={`Toggle ${channel.name}`}
									/>
								</TableCell>
								<TableCell align="center">
									<IconButton
										aria-label={`${channel.is_favorite ? "Remove" : "Add"} ${channel.name} favorite`}
										disabled
										size="small"
									>
										{channel.is_favorite ? (
											<StarIcon sx={{ fontSize: 16, color: "warning.main" }} />
										) : (
											<StarBorderIcon sx={{ fontSize: 16 }} />
										)}
									</IconButton>
								</TableCell>
							</TableRow>
						))}
						{channels.length === 0 && (
							<TableRow>
								<TableCell colSpan={4}>
									<Typography
										variant="body2"
										color="text.secondary"
										align="center"
										sx={{ py: 2 }}
									>
										No channels found. Run the EPG parser on the backend first.
									</Typography>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>
		</Box>
	);
}
