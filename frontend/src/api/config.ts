const DEFAULT_API_BASE_URL = "http://localhost:3001";

export function getApiBaseUrl(): string {
	const configured = import.meta.env.VITE_API_BASE_URL;
	return (configured ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}
