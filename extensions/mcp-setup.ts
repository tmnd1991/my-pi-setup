import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const RUN_SH = fileURLToPath(new URL("../project/.pi/scripts/mcp/run.sh", import.meta.url));

type ServerConfig = { command: string; args: string[]; description?: string };

// Servers offered by /toolkit-mcp. Launched through run.sh so secrets can live in
// ~/.config/<repo-folder>/.mcp.env instead of the repository.
const CATALOG: Record<string, ServerConfig> = {
  context7: {
    command: "sh",
    args: [RUN_SH, "npx", "-y", "@upstash/context7-mcp@1.0.31"],
    description: "Up-to-date library documentation and code examples",
  },
};

const userConfigPath = () => join(homedir(), ".pi", "agent", "mcp.json");
const projectConfigPath = (cwd: string) => join(cwd, ".pi", "mcp.json");
const dismissPath = () => join(homedir(), ".pi", "agent", "pi-toolkit-mcp-dismissed");

function readServers(path: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path, "utf8")).mcpServers ?? {};
  } catch {
    return {};
  }
}

function missingServers(cwd: string): string[] {
  const configured = new Set([
    ...Object.keys(readServers(userConfigPath())),
    ...Object.keys(readServers(projectConfigPath(cwd))),
  ]);
  return Object.keys(CATALOG).filter((name) => !configured.has(name));
}

function install(names: string[], cwd: string): void {
  const path = projectConfigPath(cwd);
  let json: Record<string, any> = {};
  try {
    json = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    if (existsSync(path)) throw new Error(path + " is not valid JSON; fix it and retry.");
  }
  json.mcpServers ??= {};
  for (const name of names) json.mcpServers[name] ??= CATALOG[name]; // never overwrite
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
}

export default function (pi: ExtensionAPI) {
  let reminded = false;

  pi.registerCommand("toolkit-mcp", {
    description: "Install the toolkit's recommended MCP servers (or 'dismiss' to stop reminders)",
    handler: async (args, ctx) => {
      if (args.trim() === "dismiss") {
        mkdirSync(dirname(dismissPath()), { recursive: true });
        writeFileSync(dismissPath(), "");
        ctx.ui.notify("MCP reminders dismissed. /toolkit-mcp still works.", "info");
        return;
      }
      const missing = missingServers(ctx.cwd);
      if (missing.length === 0) {
        ctx.ui.notify("All recommended MCP servers are already configured.", "info");
        return;
      }
      const chosen: string[] = [];
      for (const name of missing) {
        const ok = await ctx.ui.confirm("Install MCP server '" + name + "'?", CATALOG[name].description ?? "");
        if (ok) chosen.push(name);
      }
      if (chosen.length === 0) return;
      install(chosen, ctx.cwd);
      ctx.ui.notify(
        "Added " + chosen.join(", ") + " to " + projectConfigPath(ctx.cwd) +
          " (project servers load only in trusted projects). Put secrets in ~/.config/<repo-folder>/.mcp.env, then run /reload and 'pi mcp list'.",
        "info",
      );
    },
  });

  const pending = (cwd: string) => (existsSync(dismissPath()) ? [] : missingServers(cwd));

  pi.on("session_start", (_event, ctx) => {
    const missing = pending(ctx.cwd);
    if (missing.length) {
      ctx.ui.notify(
        "Recommended MCP servers not set up: " + missing.join(", ") +
          ". Run /toolkit-mcp to install (or /toolkit-mcp dismiss).",
        "warning",
      );
    }
  });

  pi.on("before_agent_start", (event, ctx) => {
    const missing = pending(ctx.cwd);
    if (missing.length && !reminded) {
      reminded = true; // once per session
      event.systemPromptOptions.sections.toolkit_mcp_reminder =
        "The user has not set up these recommended MCP servers: " + missing.join(", ") +
        ". At a natural point in your first reply, briefly mention they can run /toolkit-mcp to install them. Do not mention it again.";
    } else {
      delete event.systemPromptOptions.sections.toolkit_mcp_reminder;
    }
  });
}
