import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 8000, // Change this to your desired port
		hmr: false,
		proxy: {
			'/api': {
				target: 'http://localhost:8000',
				changeOrigin: true,
				secure: false,
			},
		},
	},
	build: {
		outDir: "dist", // Output directory for Vite build
	},
});
