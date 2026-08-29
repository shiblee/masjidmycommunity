import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Listen on all network interfaces, not just localhost, so the dev
  // server is reachable from another device on the same Wi-Fi/LAN
  // (e.g. http://192.168.x.x:5173) for testing on a phone or another
  // machine.
  server: { host: true },
});
