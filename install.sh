#!/usr/bin/env bash
# ai-toolkit installer for macOS and Linux.
#
#   curl -fsSL https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.sh | bash -s -- --dry-run
#   ./install.sh --level 1 --target claude        # from a local clone
#
# This is a thin wrapper: it checks prerequisites, gets the repository
# (local clone or a fresh download) and runs bin/ai-toolkit.mjs with the
# same arguments. Run with --help to see every option.
set -euo pipefail

REPO="dev-cristhian/ai-toolkit"
REF="${AI_TOOLKIT_REF:-main}"
MIN_NODE="22.20" # required by the pinned skills CLI (skills@1.7.6)

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 \
  || fail "Node.js ${MIN_NODE}+ is required. Install it from https://nodejs.org and run this again."
node -e '
  const [major, minor] = process.versions.node.split(/\./).map(Number);
  const [needMajor, needMinor] = process.argv[1].split(/\./).map(Number);
  process.exit(major > needMajor || (major === needMajor && minor >= needMinor) ? 0 : 1);
' "$MIN_NODE" \
  || fail "Node.js ${MIN_NODE}+ is required (found $(node --version))."

# Prefer the local checkout when this script is executed from a clone.
root=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "$script_dir/bin/ai-toolkit.mjs" ]; then
    root="$script_dir"
  fi
fi

if [ -z "$root" ]; then
  command -v curl >/dev/null 2>&1 || fail "curl is required to download ai-toolkit."
  command -v tar >/dev/null 2>&1 || fail "tar is required to extract ai-toolkit."
  tmp_dir="$(mktemp -d 2>/dev/null || mktemp -d -t ai-toolkit)"
  trap 'rm -rf "$tmp_dir"' EXIT
  printf 'Downloading %s (%s)...\n' "$REPO" "$REF"
  curl -fsSL "https://codeload.github.com/${REPO}/tar.gz/${REF}" | tar -xz -C "$tmp_dir" --strip-components=1 \
    || fail "Could not download https://github.com/${REPO} (ref: ${REF})."
  root="$tmp_dir"
fi

cli="$root/bin/ai-toolkit.mjs"
[ -f "$cli" ] || fail "The downloaded copy of ${REPO} (ref: ${REF}) does not contain bin/ai-toolkit.mjs."

# With "curl | bash" stdin is the script itself, so confirmation prompts must
# read from the terminal instead. Fall back to plain stdin when there is none (CI).
status=0
if [ -t 0 ]; then
  node "$cli" "$@" || status=$?
elif { : </dev/tty; } 2>/dev/null; then
  node "$cli" "$@" </dev/tty || status=$?
else
  node "$cli" "$@" || status=$?
fi
exit "$status"
