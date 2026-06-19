import { Alert, Container } from "@mui/material";

interface EpgUnavailableMessageProps {
	detail?: string;
}

export default function EpgUnavailableMessage({
	detail,
}: EpgUnavailableMessageProps) {
	return (
		<Container maxWidth="sm">
			<Alert severity="info" sx={{ m: 1 }}>
				No EPG data available. Open Settings, enter a valid open-epg.com URL,
				and click Refresh EPG Data.
				{detail ? ` ${detail}` : ""}
			</Alert>
		</Container>
	);
}
