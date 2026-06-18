import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import TvIcon from "@mui/icons-material/Tv";
import { Avatar, Box, IconButton, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { Channel, Program } from "../types/api";
import {
	formatDurationMinutes,
	formatLocalDateTime,
	formatLocalTime,
} from "../utils/time";

const CHANNEL_COLUMN_WIDTH = 196;
const ROW_HEIGHT = 40;
const PIXELS_PER_MINUTE = 2.5;

interface EpgGridProps {
	channels: Channel[];
	programsByChannel: Map<string, Program[]>;
	windowStart: number;
	windowEnd: number;
	onToggleFavorite: (channelId: string, isFavorite: boolean) => void;
	isUpdatingFavorite: boolean;
}

function ChannelCell({
	channel,
	onToggleFavorite,
	isUpdatingFavorite,
}: {
	channel: Channel;
	onToggleFavorite: (channelId: string, isFavorite: boolean) => void;
	isUpdatingFavorite: boolean;
}) {
	return (
		<Box
			sx={{
				width: CHANNEL_COLUMN_WIDTH,
				minWidth: CHANNEL_COLUMN_WIDTH,
				height: ROW_HEIGHT,
				display: "flex",
				alignItems: "center",
				gap: 0.5,
				px: 0.5,
				borderRight: 1,
				borderColor: "divider",
				bgcolor: "background.paper",
				position: "sticky",
				left: 0,
				zIndex: 2,
			}}
		>
			<IconButton
				aria-label={`${channel.is_favorite ? "Remove" : "Add"} ${channel.name} favorite`}
				disabled={isUpdatingFavorite}
				onClick={() => onToggleFavorite(channel.id, !channel.is_favorite)}
				sx={{ p: 0.25 }}
			>
				{channel.is_favorite ? (
					<StarIcon sx={{ fontSize: 16, color: "warning.main" }} />
				) : (
					<StarBorderIcon sx={{ fontSize: 16 }} />
				)}
			</IconButton>

			{channel.icon ? (
				<Avatar
					alt={channel.name}
					src={channel.icon}
					variant="rounded"
					sx={{ width: 22, height: 22 }}
				/>
			) : (
				<Avatar variant="rounded" sx={{ width: 22, height: 22 }}>
					<TvIcon sx={{ fontSize: 14 }} />
				</Avatar>
			)}

			<Typography
				variant="body2"
				noWrap
				sx={{ flex: 1, fontSize: "0.75rem", lineHeight: 1.2 }}
			>
				{channel.name}
			</Typography>
		</Box>
	);
}

function ProgramBlock({
	program,
	windowStart,
	timelineWidth,
}: {
	program: Program;
	windowStart: number;
	timelineWidth: number;
}) {
	const theme = useTheme();
	const pixelsPerSecond = PIXELS_PER_MINUTE / 60;
	const left = Math.max(
		0,
		(program.start_time - windowStart) * pixelsPerSecond,
	);
	const rawWidth = (program.end_time - program.start_time) * pixelsPerSecond;
	const maxWidth = timelineWidth - left;
	const width = Math.max(Math.min(rawWidth, maxWidth), 28);

	if (left >= timelineWidth || width <= 0) {
		return null;
	}

	const tooltip = [
		program.title,
		`${formatLocalDateTime(program.start_time)} - ${formatLocalTime(program.end_time)}`,
		program.description,
		program.category ? `Category: ${program.category}` : null,
	]
		.filter(Boolean)
		.join("\n");

	return (
		<Tooltip
			title={
				<Box component="span" sx={{ whiteSpace: "pre-line" }}>
					{tooltip}
				</Box>
			}
			enterDelay={400}
		>
			<Box
				sx={{
					position: "absolute",
					left,
					top: 4,
					width,
					height: ROW_HEIGHT - 8,
					px: 0.5,
					py: 0.25,
					boxSizing: "border-box",
					borderRadius: 0.5,
					border: 1,
					borderColor: "primary.light",
					bgcolor: alpha(
						theme.palette.primary.main,
						theme.palette.mode === "dark" ? 0.24 : 0.12,
					),
					overflow: "hidden",
					cursor: "default",
				}}
			>
				<Typography
					variant="caption"
					noWrap
					sx={{ display: "block", fontWeight: 600, lineHeight: 1.2 }}
				>
					{program.title}
				</Typography>
				<Typography
					variant="caption"
					noWrap
					color="text.secondary"
					sx={{ fontSize: "0.625rem", lineHeight: 1.1 }}
				>
					{formatLocalTime(program.start_time)} (
					{formatDurationMinutes(program.start_time, program.end_time)}m)
				</Typography>
			</Box>
		</Tooltip>
	);
}

function TimeHeader({
	windowStart,
	windowEnd,
	timelineWidth,
}: {
	windowStart: number;
	windowEnd: number;
	timelineWidth: number;
}) {
	const labels: { left: number; label: string }[] = [];
	const pixelsPerSecond = PIXELS_PER_MINUTE / 60;
	const hourStep = 3600;

	for (
		let timestamp = windowStart;
		timestamp < windowEnd;
		timestamp += hourStep
	) {
		labels.push({
			left: (timestamp - windowStart) * pixelsPerSecond,
			label: formatLocalTime(timestamp),
		});
	}

	return (
		<Box
			sx={{
				position: "relative",
				width: timelineWidth,
				height: 28,
				borderBottom: 1,
				borderColor: "divider",
				bgcolor: "background.paper",
			}}
		>
			{labels.map((item) => (
				<Box
					key={item.label + item.left}
					sx={{
						position: "absolute",
						left: item.left,
						top: 0,
						height: "100%",
						borderLeft: 1,
						borderColor: "divider",
						pl: 0.5,
						pt: 0.25,
					}}
				>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ fontSize: "0.6875rem" }}
					>
						{item.label}
					</Typography>
				</Box>
			))}
		</Box>
	);
}

export default function EpgGrid({
	channels,
	programsByChannel,
	windowStart,
	windowEnd,
	onToggleFavorite,
	isUpdatingFavorite,
}: EpgGridProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const timelineWidth = Math.max(
		(windowEnd - windowStart) * (PIXELS_PER_MINUTE / 60),
		600,
	);

	const rowVirtualizer = useVirtualizer({
		count: channels.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 8,
	});

	const virtualRows = rowVirtualizer.getVirtualItems();

	return (
		<Box
			sx={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
			}}
		>
			<Box
				sx={{
					display: "flex",
					borderBottom: 1,
					borderColor: "divider",
					flexShrink: 0,
				}}
			>
				<Box
					sx={{
						width: CHANNEL_COLUMN_WIDTH,
						minWidth: CHANNEL_COLUMN_WIDTH,
						height: 28,
						display: "flex",
						alignItems: "center",
						px: 1,
						borderRight: 1,
						borderColor: "divider",
						bgcolor: "background.paper",
						position: "sticky",
						left: 0,
						zIndex: 3,
					}}
				>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ fontWeight: 600 }}
					>
						Channels
					</Typography>
				</Box>
				<Box sx={{ overflow: "hidden", flex: 1 }}>
					<TimeHeader
						windowStart={windowStart}
						windowEnd={windowEnd}
						timelineWidth={timelineWidth}
					/>
				</Box>
			</Box>

			<Box ref={scrollRef} sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
				<Box
					sx={{
						width: CHANNEL_COLUMN_WIDTH + timelineWidth,
						position: "relative",
					}}
				>
					<Box
						sx={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
					>
						{virtualRows.map((virtualRow) => {
							const channel = channels[virtualRow.index];
							const programs = programsByChannel.get(channel.id) ?? [];

							return (
								<Box
									key={channel.id}
									sx={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										transform: `translateY(${virtualRow.start}px)`,
										display: "flex",
										height: ROW_HEIGHT,
										borderBottom: 1,
										borderColor: "divider",
									}}
								>
									<ChannelCell
										channel={channel}
										onToggleFavorite={onToggleFavorite}
										isUpdatingFavorite={isUpdatingFavorite}
									/>
									<Box
										sx={{
											position: "relative",
											width: timelineWidth,
											height: ROW_HEIGHT,
											flexShrink: 0,
										}}
									>
										{programs.map((program) => (
											<ProgramBlock
												key={program.id}
												program={program}
												windowStart={windowStart}
												timelineWidth={timelineWidth}
											/>
										))}
									</Box>
								</Box>
							);
						})}
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
