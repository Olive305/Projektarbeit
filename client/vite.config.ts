import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		port: 8081, // Change this to your desired port
		hmr: false,
	},
	build: {
		outDir: "dist", // Output directory for Vite build
	},
});
