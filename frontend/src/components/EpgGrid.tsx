import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import TvIcon from "@mui/icons-material/Tv";
import {
	Avatar,
	Box,
	IconButton,
	Tooltip,
	Typography,
	useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDisplayFormat } from "../context/displayFormatContext";
import type { Channel, Program } from "../types/api";
import { formatDurationMinutes } from "../utils/time";

const PROGRAM_GAP = 4;

const Z_INDEX_PROGRAM = 1;
const Z_INDEX_NOW_LINE = 2;
const Z_INDEX_STICKY_HEADER = 3;
const Z_INDEX_STICKY_CHANNEL = 4;

interface EpgLayout {
	channelColumnWidth: number;
	headerHeight: number;
	rowHeight: number;
	pixelsPerMinute: number;
	minProgramWidth: number;
	isMobile: boolean;
}

interface EpgGridProps {
	channels: Channel[];
	programsByChannel: Map<string, Program[]>;
	windowStart: number;
	windowEnd: number;
	onToggleFavorite: (channelId: string, isFavorite: boolean) => void;
	isUpdatingFavorite: boolean;
}

function getPixelsPerSecond(layout: EpgLayout): number {
	return layout.pixelsPerMinute / 60;
}

function getTimelineWidth(
	windowStart: number,
	windowEnd: number,
	layout: EpgLayout,
): number {
	return Math.max(
		(windowEnd - windowStart) * getPixelsPerSecond(layout),
		layout.isMobile ? 480 : 600,
	);
}

function getTimelineOffset(
	unixSeconds: number,
	windowStart: number,
	layout: EpgLayout,
): number {
	return (unixSeconds - windowStart) * getPixelsPerSecond(layout);
}

function useEpgLayout(): EpgLayout {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

	return useMemo(
		() => ({
			isMobile,
			channelColumnWidth: isMobile ? 44 : 208,
			headerHeight: isMobile ? 28 : 32,
			rowHeight: isMobile ? 44 : 52,
			pixelsPerMinute: isMobile ? 4 : 2.5,
			minProgramWidth: isMobile ? 52 : 56,
		}),
		[isMobile],
	);
}

function ChannelCell({
	channel,
	layout,
	onToggleFavorite,
	isUpdatingFavorite,
}: {
	channel: Channel;
	layout: EpgLayout;
	onToggleFavorite: (channelId: string, isFavorite: boolean) => void;
	isUpdatingFavorite: boolean;
}) {
	return (
		<Box
			sx={{
				width: "100%",
				height: layout.rowHeight,
				display: "flex",
				alignItems: "center",
				justifyContent: { xs: "center", sm: "flex-start" },
				gap: { xs: 0, sm: 0.75 },
				px: { xs: 0.25, sm: 1 },
				borderRight: 1,
				borderColor: "divider",
				bgcolor: "background.paper",
				boxSizing: "border-box",
			}}
		>
			<IconButton
				aria-label={`${channel.is_favorite ? "Remove" : "Add"} ${channel.name} favorite`}
				disabled={isUpdatingFavorite}
				onClick={() => onToggleFavorite(channel.id, !channel.is_favorite)}
				sx={{
					p: 0.25,
					display: { xs: "none", sm: "inline-flex" },
				}}
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
					sx={{
						width: { xs: 28, sm: 24 },
						height: { xs: 28, sm: 24 },
					}}
				/>
			) : (
				<Avatar
					variant="rounded"
					sx={{
						width: { xs: 28, sm: 24 },
						height: { xs: 28, sm: 24 },
						fontSize: { xs: "0.75rem", sm: "0.875rem" },
					}}
				>
					<TvIcon sx={{ fontSize: { xs: 16, sm: 14 } }} />
				</Avatar>
			)}

			<Typography
				variant="body2"
				noWrap
				sx={{
					flex: 1,
					fontSize: "0.8125rem",
					lineHeight: 1.2,
					display: { xs: "none", sm: "block" },
				}}
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
	layout,
}: {
	program: Program;
	windowStart: number;
	timelineWidth: number;
	layout: EpgLayout;
}) {
	const theme = useTheme();
	const { formatTime, formatDateTime } = useDisplayFormat();
	const pixelsPerSecond = getPixelsPerSecond(layout);
	const left = Math.max(
		0,
		getTimelineOffset(program.start_time, windowStart, layout),
	);
	const rawWidth =
		(program.end_time - program.start_time) * pixelsPerSecond - PROGRAM_GAP * 2;
	const maxWidth = timelineWidth - left - PROGRAM_GAP;
	const width = Math.max(Math.min(rawWidth, maxWidth), layout.minProgramWidth);

	if (left >= timelineWidth || width <= 0) {
		return null;
	}

	const tooltip = [
		program.title,
		`${formatDateTime(program.start_time)} - ${formatTime(program.end_time)}`,
		program.description,
		program.category ? `Category: ${program.category}` : null,
	]
		.filter(Boolean)
		.join("\n");

	const showMeta = !layout.isMobile && width >= 88;

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
					left: left + PROGRAM_GAP,
					top: { xs: 4, sm: 6 },
					width,
					height: layout.rowHeight - (layout.isMobile ? 8 : 12),
					px: { xs: 0.75, sm: 1 },
					py: { xs: 0.5, sm: 0.75 },
					boxSizing: "border-box",
					borderRadius: 1,
					border: 1,
					borderColor: "divider",
					bgcolor:
						theme.palette.mode === "dark"
							? alpha(theme.palette.background.paper, 0.96)
							: theme.palette.background.paper,
					boxShadow:
						theme.palette.mode === "dark"
							? `inset 3px 0 0 ${theme.palette.primary.main}`
							: `inset 3px 0 0 ${theme.palette.primary.main}, 0 1px 2px ${alpha(theme.palette.common.black, 0.08)}`,
					overflow: "hidden",
					cursor: "default",
					zIndex: Z_INDEX_PROGRAM,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
				}}
			>
				<Typography
					variant="caption"
					sx={{
						display: "block",
						fontWeight: 600,
						lineHeight: 1.25,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						width: "100%",
						fontSize: { xs: "0.6875rem", sm: "0.75rem" },
					}}
				>
					{program.title}
				</Typography>
				{showMeta && (
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{
							display: "block",
							mt: 0.25,
							fontSize: "0.6875rem",
							lineHeight: 1.2,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{formatTime(program.start_time)} ·{" "}
						{formatDurationMinutes(program.start_time, program.end_time)}m
					</Typography>
				)}
			</Box>
		</Tooltip>
	);
}

function HourGridLines({
	windowStart,
	windowEnd,
	timelineWidth,
	height,
	layout,
}: {
	windowStart: number;
	windowEnd: number;
	timelineWidth: number;
	height: number | string;
	layout: EpgLayout;
}) {
	const lines: number[] = [];

	for (let timestamp = windowStart; timestamp < windowEnd; timestamp += 3600) {
		lines.push(getTimelineOffset(timestamp, windowStart, layout));
	}

	return (
		<Box
			sx={{
				position: "absolute",
				inset: 0,
				width: timelineWidth,
				height,
				pointerEvents: "none",
			}}
		>
			{lines.map((left) => (
				<Box
					key={left}
					sx={{
						position: "absolute",
						left,
						top: 0,
						height: "100%",
						borderLeft: 1,
						borderColor: "divider",
						opacity: 0.55,
					}}
				/>
			))}
		</Box>
	);
}

function TimeHeader({
	windowStart,
	windowEnd,
	timelineWidth,
	layout,
}: {
	windowStart: number;
	windowEnd: number;
	timelineWidth: number;
	layout: EpgLayout;
}) {
	const { formatTime } = useDisplayFormat();
	const labels: { left: number; label: string }[] = [];

	for (let timestamp = windowStart; timestamp < windowEnd; timestamp += 3600) {
		labels.push({
			left: getTimelineOffset(timestamp, windowStart, layout),
			label: formatTime(timestamp),
		});
	}

	return (
		<Box
			sx={{
				position: "relative",
				width: timelineWidth,
				height: layout.headerHeight,
				borderBottom: 1,
				borderColor: "divider",
				bgcolor: "background.default",
			}}
		>
			<HourGridLines
				windowStart={windowStart}
				windowEnd={windowEnd}
				timelineWidth={timelineWidth}
				height={layout.headerHeight}
				layout={layout}
			/>
			{labels.map((item) => (
				<Box
					key={`${item.label}-${item.left}`}
					sx={{
						position: "absolute",
						left: item.left,
						top: 0,
						height: "100%",
						display: "flex",
						alignItems: "center",
						pl: 1,
					}}
				>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{
							fontSize: { xs: "0.6875rem", sm: "0.75rem" },
							fontWeight: 600,
						}}
					>
						{item.label}
					</Typography>
				</Box>
			))}
		</Box>
	);
}

function CurrentTimeIndicator({
	left,
	height,
}: {
	left: number;
	height: number;
}) {
	const theme = useTheme();

	return (
		<Box
			sx={{
				position: "absolute",
				left,
				top: 0,
				height,
				width: 2,
				transform: "translateX(-1px)",
				bgcolor: theme.palette.error.main,
				boxShadow: `0 0 0 1px ${alpha(theme.palette.error.main, 0.25)}`,
				zIndex: Z_INDEX_NOW_LINE,
				pointerEvents: "none",
			}}
		>
			<Box
				sx={{
					position: "absolute",
					top: 0,
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: 8,
					height: 8,
					borderRadius: "50%",
					bgcolor: theme.palette.error.main,
					border: 2,
					borderColor: "background.paper",
				}}
			/>
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
	const theme = useTheme();
	const layout = useEpgLayout();
	const scrollRef = useRef<HTMLDivElement>(null);
	const [nowUnix, setNowUnix] = useState(() => Math.floor(Date.now() / 1000));

	const timelineWidth = useMemo(
		() => getTimelineWidth(windowStart, windowEnd, layout),
		[windowStart, windowEnd, layout],
	);

	const currentTimeLeft = useMemo(() => {
		if (nowUnix < windowStart || nowUnix > windowEnd) {
			return null;
		}
		return getTimelineOffset(nowUnix, windowStart, layout);
	}, [nowUnix, windowStart, windowEnd, layout]);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			setNowUnix(Math.floor(Date.now() / 1000));
		}, 60_000);

		return () => window.clearInterval(intervalId);
	}, []);

	const rowVirtualizer = useVirtualizer({
		count: channels.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => layout.rowHeight,
		overscan: 8,
	});

	const virtualRows = rowVirtualizer.getVirtualItems();
	const bodyHeight = rowVirtualizer.getTotalSize();
	const timelineContentHeight = layout.headerHeight + bodyHeight;

	return (
		<Box sx={{ height: "100%", minHeight: 0 }}>
			<Box
				ref={scrollRef}
				sx={{
					height: "100%",
					overflow: "auto",
					minHeight: 0,
					bgcolor: "background.default",
				}}
			>
				<Box
					sx={{
						display: "flex",
						width: layout.channelColumnWidth + timelineWidth,
						minHeight: "100%",
					}}
				>
					<Box
						sx={{
							width: layout.channelColumnWidth,
							minWidth: layout.channelColumnWidth,
							flexShrink: 0,
							position: "sticky",
							left: 0,
							zIndex: Z_INDEX_STICKY_CHANNEL,
							bgcolor: "background.paper",
							borderRight: 1,
							borderColor: "divider",
						}}
					>
						<Box
							sx={{
								height: layout.headerHeight,
								display: "flex",
								alignItems: "center",
								justifyContent: { xs: "center", sm: "flex-start" },
								px: { xs: 0.25, sm: 1 },
								borderBottom: 1,
								borderColor: "divider",
								position: "sticky",
								top: 0,
								zIndex: Z_INDEX_STICKY_HEADER,
								bgcolor: "background.paper",
							}}
						>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{
									fontWeight: 700,
									letterSpacing: 0.2,
									display: { xs: "none", sm: "block" },
								}}
							>
								Channels
							</Typography>
						</Box>

						<Box sx={{ position: "relative", height: bodyHeight }}>
							{virtualRows.map((virtualRow) => {
								const channel = channels[virtualRow.index];

								return (
									<Box
										key={channel.id}
										sx={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											transform: `translateY(${virtualRow.start}px)`,
											height: layout.rowHeight,
											borderBottom: 1,
											borderColor: alpha(theme.palette.divider, 0.7),
											bgcolor:
												virtualRow.index % 2 === 0
													? "background.paper"
													: alpha(theme.palette.action.hover, 0.04),
										}}
									>
										<ChannelCell
											channel={channel}
											layout={layout}
											onToggleFavorite={onToggleFavorite}
											isUpdatingFavorite={isUpdatingFavorite}
										/>
									</Box>
								);
							})}
						</Box>
					</Box>

					<Box
						sx={{
							position: "relative",
							width: timelineWidth,
							minWidth: timelineWidth,
							flexShrink: 0,
						}}
					>
						<Box
							sx={{
								position: "sticky",
								top: 0,
								zIndex: Z_INDEX_STICKY_HEADER,
							}}
						>
							<TimeHeader
								windowStart={windowStart}
								windowEnd={windowEnd}
								timelineWidth={timelineWidth}
								layout={layout}
							/>
						</Box>

						<Box sx={{ position: "relative", height: bodyHeight }}>
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
											width: timelineWidth,
											transform: `translateY(${virtualRow.start}px)`,
											height: layout.rowHeight,
											borderBottom: 1,
											borderColor: alpha(theme.palette.divider, 0.7),
											bgcolor:
												virtualRow.index % 2 === 0
													? "transparent"
													: alpha(theme.palette.background.paper, 0.35),
										}}
									>
										<HourGridLines
											windowStart={windowStart}
											windowEnd={windowEnd}
											timelineWidth={timelineWidth}
											height={layout.rowHeight}
											layout={layout}
										/>
										{programs.map((program) => (
											<ProgramBlock
												key={program.id}
												program={program}
												windowStart={windowStart}
												timelineWidth={timelineWidth}
												layout={layout}
											/>
										))}
									</Box>
								);
							})}
						</Box>

						{currentTimeLeft != null && (
							<CurrentTimeIndicator
								left={currentTimeLeft}
								height={timelineContentHeight}
							/>
						)}
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
