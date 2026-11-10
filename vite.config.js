import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/,
// so every asset URL must start with "/<repo>/".
// In GitHub Actions, GITHUB_REPOSITORY is "<user>/<repo>", so the base path
// follows the repository name automatically (rename the repo, nothing to edit).
// Locally (npm run dev) the variable is absent and the base stays "/".
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  plugins: [react()],
  base: repo ? `/${repo}/` : "/",
});
