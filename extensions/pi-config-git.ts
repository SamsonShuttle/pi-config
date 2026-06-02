import os from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const CONFIG_DIR = path.join(os.homedir(), ".pi", "agent");

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export default function piConfigGit(pi: ExtensionAPI) {
	pi.registerCommand("pi-config-status", {
		description: "Show git status for ~/.pi/agent config repo",
		handler: async (_args, ctx) => {
			const result = await pi.exec("git", ["status", "--short"], { cwd: CONFIG_DIR });
			const output = result.stdout.trim() || "clean";
			ctx.ui.notify(`pi config status:\n${output}`, "info");
		},
	});

	pi.registerCommand("pi-config-push", {
		description: "Commit and push ~/.pi/agent config repo. Usage: /pi-config-push [message]",
		handler: async (args, ctx) => {
			const message = args.trim() || `Update pi config ${new Date().toISOString()}`;

			ctx.ui.notify("Checking pi config git status...", "info");
			const status = await pi.exec("git", ["status", "--porcelain"], { cwd: CONFIG_DIR });
			if (!status.stdout.trim()) {
				ctx.ui.notify("Pi config repo is clean; nothing to push.", "info");
				return;
			}

			const command = [
				"git add README.md .gitignore settings.json themes extensions",
				`git commit -m ${shellQuote(message)}`,
				"git push",
			].join(" && ");

			ctx.ui.notify(`Committing pi config: ${message}`, "info");
			const result = await pi.exec("bash", ["-lc", command], { cwd: CONFIG_DIR, timeout: 120000 });

			const combined = `${result.stdout}\n${result.stderr}`.trim();
			if (result.code === 0) {
				ctx.ui.notify(`Pi config pushed.\n${combined}`, "info");
			} else {
				ctx.ui.notify(`Pi config push failed.\n${combined}`, "error");
			}
		},
	});
}
