import fs from "node:fs";
import path from "node:path";

const MOCK_EPG_PATH = path.join(process.cwd(), "mock-epg.xml");

const PROGRAM_DURATIONS_MINUTES = [30, 60, 60, 90, 120, 45, 60, 30, 120, 60];

interface MockChannel {
	id: string;
	name: string;
	icon: string;
	scheduleOffsetMinutes: number;
	shows: MockShow[];
}

interface MockShow {
	title: string;
	description: string;
	category: string;
}

interface GeneratedProgram {
	channelId: string;
	startUnix: number;
	endUnix: number;
	title: string;
	description: string;
	category: string;
}

const MOCK_CHANNELS: MockChannel[] = [
	{
		id: "bbc-one.uk",
		name: "BBC One",
		icon: "https://example.com/icons/bbc-one.png",
		scheduleOffsetMinutes: 0,
		shows: [
			{
				title: "Breakfast",
				description: "Morning news, weather, and interviews.",
				category: "News",
			},
			{
				title: "Homes Under the Hammer",
				description: "Property auctions and renovation stories.",
				category: "Entertainment",
			},
			{
				title: "BBC News at One",
				description: "Midday national and international news.",
				category: "News",
			},
			{
				title: "Doctors",
				description: "Drama from the staff of a busy medical centre.",
				category: "Drama",
			},
			{
				title: "Pointless",
				description: "Quiz show searching for obscure correct answers.",
				category: "Entertainment",
			},
			{
				title: "BBC News at Six",
				description: "Evening news bulletin with regional updates.",
				category: "News",
			},
			{
				title: "The Repair Shop",
				description: "Experts restore treasured family heirlooms.",
				category: "Entertainment",
			},
			{
				title: "Doctor Who",
				description: "The Doctor faces a threat across space and time.",
				category: "Drama",
			},
			{
				title: "Match of the Day",
				description: "Highlights and analysis from the weekend's football.",
				category: "Sport",
			},
		],
	},
	{
		id: "ard.de",
		name: "ARD",
		icon: "https://example.com/icons/ard.png",
		scheduleOffsetMinutes: 15,
		shows: [
			{
				title: "Morgenmagazin",
				description: "German morning show with news and interviews.",
				category: "News",
			},
			{
				title: "ARD Mittagsmagazin",
				description: "Midday news and current affairs.",
				category: "News",
			},
			{
				title: "Tagesschau",
				description: "Main evening news from ARD.",
				category: "News",
			},
			{
				title: "Tatort",
				description: "Crime investigation in a German city.",
				category: "Drama",
			},
			{
				title: "Wer weiß denn sowas?",
				description: "Celebrity panel quiz about general knowledge.",
				category: "Entertainment",
			},
			{
				title: "Sportschau",
				description: "Sports highlights and reports.",
				category: "Sport",
			},
			{
				title: "Brisant",
				description: "Magazine covering people and lifestyle topics.",
				category: "Entertainment",
			},
			{
				title: "Panorama",
				description: "Investigative journalism and documentaries.",
				category: "Documentary",
			},
		],
	},
	{
		id: "zdf.de",
		name: "ZDF",
		icon: "https://example.com/icons/zdf.png",
		scheduleOffsetMinutes: 30,
		shows: [
			{
				title: "ZDF-Morgenmagazin",
				description: "Morning news and talk segments.",
				category: "News",
			},
			{
				title: "Volle Kanne",
				description: "Lifestyle magazine with cooking and guests.",
				category: "Entertainment",
			},
			{
				title: "heute",
				description: "Evening news from ZDF.",
				category: "News",
			},
			{
				title: "Die Küchen-Schlacht",
				description: "Cooking competition between amateur chefs.",
				category: "Entertainment",
			},
			{
				title: "Traumschiff",
				description: "Classic cruise ship adventure series.",
				category: "Drama",
			},
			{
				title: "heute journal",
				description: "In-depth evening news analysis.",
				category: "News",
			},
			{
				title: "Wetten, dass..?",
				description: "Live entertainment show with celebrity guests.",
				category: "Entertainment",
			},
			{
				title: "Terra X",
				description: "Science and history documentary slot.",
				category: "Documentary",
			},
		],
	},
];

export interface MockScheduleWindow {
	startUnix: number;
	endUnix: number;
}

export function getMockScheduleWindow(
	referenceMs: number = Date.now(),
): MockScheduleWindow {
	const reference = new Date(referenceMs);
	const todayStartUtc = Date.UTC(
		reference.getUTCFullYear(),
		reference.getUTCMonth(),
		reference.getUTCDate(),
	);

	const startUnix = Math.floor((todayStartUtc - 24 * 60 * 60 * 1000) / 1000);
	const endUnix = Math.floor((todayStartUtc + 4 * 24 * 60 * 60 * 1000) / 1000);

	return { startUnix, endUnix };
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export function formatXmltvDateTime(unixSeconds: number): string {
	const date = new Date(unixSeconds * 1000);
	const pad = (value: number) => String(value).padStart(2, "0");

	return `${[
		date.getUTCFullYear(),
		pad(date.getUTCMonth() + 1),
		pad(date.getUTCDate()),
		pad(date.getUTCHours()),
		pad(date.getUTCMinutes()),
		pad(date.getUTCSeconds()),
	].join("")} +0000`;
}

function generateChannelPrograms(
	channel: MockChannel,
	window: MockScheduleWindow,
): GeneratedProgram[] {
	const programs: GeneratedProgram[] = [];
	let cursor = window.startUnix + channel.scheduleOffsetMinutes * 60;
	let showIndex = 0;
	let durationIndex = 0;

	while (cursor < window.endUnix) {
		const durationMinutes =
			PROGRAM_DURATIONS_MINUTES[
				durationIndex % PROGRAM_DURATIONS_MINUTES.length
			];
		durationIndex += 1;

		const endUnix = cursor + durationMinutes * 60;
		if (endUnix > window.endUnix) {
			break;
		}

		const show = channel.shows[showIndex % channel.shows.length];
		showIndex += 1;

		programs.push({
			channelId: channel.id,
			startUnix: cursor,
			endUnix,
			title: show.title,
			description: show.description,
			category: show.category,
		});

		cursor = endUnix;
	}

	return programs;
}

export function generateMockEpgXml(referenceMs: number = Date.now()): string {
	const window = getMockScheduleWindow(referenceMs);
	const programBlocks: string[] = [];

	for (const channel of MOCK_CHANNELS) {
		const programs = generateChannelPrograms(channel, window);
		for (const program of programs) {
			programBlocks.push(`  <programme start="${formatXmltvDateTime(program.startUnix)}" stop="${formatXmltvDateTime(program.endUnix)}" channel="${program.channelId}">
    <title>${escapeXml(program.title)}</title>
    <desc>${escapeXml(program.description)}</desc>
    <category>${escapeXml(program.category)}</category>
  </programme>`);
		}
	}

	const channelBlocks = MOCK_CHANNELS.map(
		(channel) => `  <channel id="${channel.id}">
    <display-name>${escapeXml(channel.name)}</display-name>
    <icon src="${escapeXml(channel.icon)}"/>
  </channel>`,
	);

	return `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="Proxmox EPG Mock">
${channelBlocks.join("\n")}

${programBlocks.join("\n")}
</tv>
`;
}

export function writeMockEpgFile(
	outputPath: string = MOCK_EPG_PATH,
	referenceMs: number = Date.now(),
): string {
	const xml = generateMockEpgXml(referenceMs);
	fs.writeFileSync(outputPath, xml, "utf-8");
	return outputPath;
}

export function getMockEpgSummary(referenceMs: number = Date.now()): {
	channels: number;
	programs: number;
	window: MockScheduleWindow;
} {
	const window = getMockScheduleWindow(referenceMs);
	const programs = MOCK_CHANNELS.flatMap((channel) =>
		generateChannelPrograms(channel, window),
	);

	return {
		channels: MOCK_CHANNELS.length,
		programs: programs.length,
		window,
	};
}
