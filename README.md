# Pi toolkit

A Git-installable Pi package containing **all three extensions and your skills**.

## One-command installation

```sh
pi install --local git:github.com/tmnd1991/my-pi-setup
```

Append `@<tag>` to pin a release once one is published. Private repositories
require working Git authentication; Pi also accepts SSH Git sources.

Pi clones the package, installs its npm dependencies, and adds a single
project-local package declaration. No setup script, separate extension installs,
or follow-up package-update command is needed. Review project trust when asked,
then start Pi from the target project root (or reload an existing session).

### Included automatically

| Resource | Version / contents |
| --- | --- |
| Subagents | `pi-subagents@>=0.79.0` |
| LSP / code intelligence | `pi-lens@>=4.4.3`, including its four skills |
| Web access | `pi-web-access@>=0.42.0` |
| Your skills | `code-review` and `simplify` |

The Pi manifest explicitly exposes extension entry points inside `node_modules`.
Declaring dependencies alone would not load their extensions. Subagents' extra
skills and prompt templates are deliberately excluded, matching your original
resource filters.

## Releasing

Commit the sources (never `node_modules/` or `package-lock.json`), then push a
release tag matching `package.json`'s version, e.g. `v0.2.0`.

The package is private only in npm's sense: `private: true` prevents accidental
npm publication and does not prevent Git installation.

Extension versions are minimum bounds (`>=`) and no lockfile is committed, so
every install picks up the newest published release of each extension,
including major versions that may break compatibility.

## Project settings remain yours

Pi packages distribute resources, not arbitrary project settings. Installation
does **not** overwrite your models, subagent preferences, MCP servers, or
credentials.

`project/.pi/settings.json` is retained only as a reference snapshot of the old
configuration. It is not applied and is not needed for installing the extensions.
In particular, the old `subagents.disableBuiltins: true` setting is not imposed on
new projects.

Run `/toolkit-mcp` to opt in to the recommended MCP servers (currently context7).
It asks per server and merges entries into the project's `.pi/mcp.json` (read only in trusted projects) without
overwriting existing ones. Until servers are configured, Pi shows a startup warning
and the agent mentions the command once per session; run `/toolkit-mcp dismiss` to
stop reminders. Servers launch through `project/.pi/scripts/mcp/run.sh`, which
loads secrets from `~/.config/<repo-folder>/.mcp.env`, outside Git.

Do not also install these three extensions separately in the same Pi environment:
Pi sees the toolkit and each standalone package as distinct packages, so duplicate
tool/command registration is possible. Remove previous standalone declarations
when migrating; this toolkit never silently edits them.

## Prerequisites

- Pi, Git, npm, and Node.js 22.19 or newer.
- Language servers / external tools required for your chosen Lens integrations;
  bundling Lens does not guarantee every language server is installed.
- Credentials for web providers that need them.
- For the review skill to fetch issues: `gh` (GitHub) or `glab` (GitLab), or a
  project `docs/agents/issue-tracker.md` describing how to reach the tracker.

Skills are copied snapshots, not symlinks. Avoid duplicate skill copies in
`.agents/skills/` or other discovery locations. Empty `skill-creator/`, global
configuration, caches, credentials, and Taskr-specific instructions are excluded.

## Development and checks

Consumers use only the single Pi install command above. Package authors testing
a local checkout install dependencies first:

```sh
npm ci --legacy-peer-deps
npm test
```

Host Pi APIs and TypeBox are peer dependencies supplied by Pi; do not install
physical copies into the toolkit. Local `pi install --local ./my-pi-setup` does
not install dependencies, so use the Git source for the one-command experience.

After installation, inspect startup diagnostics and `pi list`, and run
`/subagents-doctor` before launching workflows. Installing never launches a
workflow or child agent.
