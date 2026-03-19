import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        allowedHosts: ["localhost", "127.0.0.1", "0.0.0.0", '7cf9-2a09-bac5-55f8-30c8-00-4dc-12.ngrok-free.app']
    }
});
