import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const backendTarget =
	process.env.VITE_DEV_BACKEND_URL ?? "http://127.0.0.1:3001";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		proxy: {
			"/api": {
				target: backendTarget,
				changeOrigin: true,
			},
		},
	},
	preview: {
		proxy: {
			"/api": {
				target: backendTarget,
				changeOrigin: true,
			},
		},
	},
});
