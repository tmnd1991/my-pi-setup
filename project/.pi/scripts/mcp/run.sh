#!/bin/sh
# Generic MCP server launcher with external-secrets support.
#
# Resolves the repository's folder name and sources a per-repo secrets file
# from outside the working tree. This keeps the secrets out of the repository
# (and therefore out of any agent harness that reads files inside it).
#
# Usage: run.sh <command> [args...]
# Example: run.sh npx -y @upstash/context7-mcp@1.0.31
#
# Secrets location:
#   ~/.config/<repo-folder-name>/.mcp.env
# where <repo-folder-name> is the basename of the git repository root.

set -eu

if [ "$#" -eq 0 ]; then
    echo "Usage: run.sh <command> [args...]" >&2
    exit 1
fi

# Resolve repository root (POSIX-portable: try git first, then walk up).
REPO_ROOT=""
if command -v git >/dev/null 2>&1; then
    REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$REPO_ROOT" ]; then
    # Fallback: walk up looking for a .git entry.
    _dir=$(pwd)
    while [ "$_dir" != "/" ]; do
        if [ -d "$_dir/.git" ]; then
            REPO_ROOT="$_dir"
            break
        fi
        _dir=$(dirname "$_dir")
    done
fi

if [ -z "$REPO_ROOT" ]; then
    echo "run.sh: not inside a git repository and no .git found in any parent" >&2
    exit 1
fi

FOLDER_NAME=$(basename "$REPO_ROOT")
SECRETS_FILE="$HOME/.config/$FOLDER_NAME/.mcp.env"

if [ -f "$SECRETS_FILE" ]; then
    # Export every assignment in the secrets file.
    set -a
    # shellcheck disable=SC1090
    . "$SECRETS_FILE"
    set +a
fi

exec "$@"
