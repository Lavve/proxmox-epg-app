export function getApiBaseUrl(): string {
	const configured = import.meta.env.VITE_API_BASE_URL;

	if (typeof configured === "string" && configured.length > 0) {
		return configured.replace(/\/$/, "");
	}

	// Same-origin /api requests are proxied by Vite in dev/preview and by Nginx in production.
	return "";
}
