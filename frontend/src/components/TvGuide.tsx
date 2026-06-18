import SearchIcon from "@mui/icons-material/Search";
import {
	Alert,
	Box,
	CircularProgress,
	InputAdornment,
	Paper,
	TextField,
	Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchChannels, updateChannel } from "../api/channels";
import { fetchPrograms } from "../api/programs";
import type { Program } from "../types/api";
import { formatLocalTime, getGuideTimeWindow } from "../utils/time";
import EpgGrid from "./EpgGrid";

function matchesSearch(program: Program, query: string): boolean {
	const normalized = query.trim().toLowerCase();
	if (!normalized) {
		return true;
	}

	const haystack = [program.title, program.description ?? ""]
		.join(" ")
		.toLowerCase();
	return haystack.includes(normalized);
}

export default function TvGuide() {
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState("");
	const timeWindow = useMemo(() => getGuideTimeWindow(24), []);

	const channelsQuery = useQuery({
		queryKey: ["channels"],
		queryFn: fetchChannels,
	});

	const programsQuery = useQuery({
		queryKey: ["programs", timeWindow.startUnix, timeWindow.endUnix],
		queryFn: () =>
			fetchPrograms({
				start: timeWindow.startUnix,
				end: timeWindow.endUnix,
			}),
	});

	const favoriteMutation = useMutation({
		mutationFn: ({ id, is_favorite }: { id: string; is_favorite: boolean }) =>
			updateChannel(id, { is_favorite }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["channels"] });
		},
	});

	const enabledChannels = useMemo(
		() => (channelsQuery.data ?? []).filter((channel) => channel.is_enabled),
		[channelsQuery.data],
	);

	const filteredPrograms = useMemo(() => {
		const programs = programsQuery.data ?? [];
		return programs.filter((program) => matchesSearch(program, searchQuery));
	}, [programsQuery.data, searchQuery]);

	const programsByChannel = useMemo(() => {
		const grouped = new Map<string, Program[]>();

		for (const program of filteredPrograms) {
			const existing = grouped.get(program.channel_id) ?? [];
			existing.push(program);
			grouped.set(program.channel_id, existing);
		}

		for (const programs of grouped.values()) {
			programs.sort((a, b) => a.start_time - b.start_time);
		}

		return grouped;
	}, [filteredPrograms]);

	const visibleChannels = useMemo(() => {
		if (!searchQuery.trim()) {
			return enabledChannels;
		}

		const channelIdsWithMatches = new Set(
			filteredPrograms.map((program) => program.channel_id),
		);
		return enabledChannels.filter((channel) =>
			channelIdsWithMatches.has(channel.id),
		);
	}, [enabledChannels, filteredPrograms, searchQuery]);

	const isLoading = channelsQuery.isLoading || programsQuery.isLoading;
	const loadError = channelsQuery.error ?? programsQuery.error;

	return (
		<Box
			sx={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				p: { xs: 0.75, sm: 1 },
				boxSizing: "border-box",
			}}
		>
			<Box
				sx={{
					display: "flex",
					flexDirection: { xs: "column", sm: "row" },
					gap: 1,
					alignItems: { xs: "stretch", sm: "center" },
					mb: 1,
					flexShrink: 0,
				}}
			>
				<TextField
					fullWidth
					placeholder="Search programs by title or description..."
					value={searchQuery}
					onChange={(event) => setSearchQuery(event.target.value)}
					sx={{
						width: { xs: "100%", sm: "auto" },
						flex: { sm: 1 },
					}}
					slotProps={{
						input: {
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon sx={{ fontSize: 18 }} />
								</InputAdornment>
							),
						},
					}}
				/>
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{
						whiteSpace: "nowrap",
						px: { xs: 0.5, sm: 0 },
						alignSelf: { xs: "flex-start", sm: "center" },
					}}
				>
					{formatLocalTime(timeWindow.startUnix)} -{" "}
					{formatLocalTime(timeWindow.endUnix)}
				</Typography>
			</Box>

			{isLoading && (
				<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
					<CircularProgress size={24} />
				</Box>
			)}

			{loadError && (
				<Alert severity="error" sx={{ mb: 1 }}>
					Failed to load TV guide: {loadError.message}
				</Alert>
			)}

			{!isLoading && !loadError && (
				<Paper
					variant="outlined"
					sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}
				>
					{visibleChannels.length === 0 ? (
						<Box sx={{ p: 2 }}>
							<Typography variant="body2" color="text.secondary">
								No enabled channels or matching programs found.
							</Typography>
						</Box>
					) : (
						<EpgGrid
							channels={visibleChannels}
							programsByChannel={programsByChannel}
							windowStart={timeWindow.startUnix}
							windowEnd={timeWindow.endUnix}
							onToggleFavorite={(channelId, isFavorite) => {
								favoriteMutation.mutate({
									id: channelId,
									is_favorite: isFavorite,
								});
							}}
							isUpdatingFavorite={favoriteMutation.isPending}
						/>
					)}
				</Paper>
			)}
		</Box>
	);
}
