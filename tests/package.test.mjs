import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const toolkit = fileURLToPath(new URL("../", import.meta.url));
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    assert.fail("Cannot read JSON at " + path + ": " + error.message);
  }
}
const manifest = readJson(join(toolkit, "package.json"));

test("all three extensions are minimum-version runtime dependencies with explicit resource entries", () => {
  assert.deepEqual(manifest.dependencies, {
    "pi-subagents": ">=0.79.0",
    "pi-lens": ">=4.4.3",
    "pi-web-access": ">=0.42.0",
  });
  assert.deepEqual(manifest.pi.extensions, [
    "./node_modules/pi-subagents/index.js",
    "./node_modules/pi-lens/dist/index.js",
    "./node_modules/pi-web-access/dist/index.js",
    "./extensions/mcp-setup.ts",
  ]);
  for (const path of manifest.pi.extensions) assert.ok(existsSync(join(toolkit, path)), path);
});

test("manifest includes toolkit and Lens skills but excludes subagent skills and prompts", () => {
  assert.deepEqual(manifest.pi.skills, ["./skills", "./node_modules/pi-lens/skills"]);
  assert.equal(manifest.pi.prompts, undefined);
  for (const path of manifest.pi.skills) assert.ok(existsSync(join(toolkit, path)), path);
});

test("host APIs are peers only and never installed as physical dependencies", () => {
  for (const name of [
    "@earendil-works/pi-ai", "@earendil-works/pi-agent-core",
    "@earendil-works/pi-coding-agent", "@earendil-works/pi-tui", "typebox",
  ]) {
    assert.equal(manifest.peerDependencies[name], "*");
    assert.equal(manifest.dependencies[name], undefined);
    assert.equal(existsSync(join(toolkit, "node_modules", name)), false, name);
  }
});

test("installed extensions satisfy their minimum versions", () => {
  const parse = (v) => v.split(".").map(Number);
  for (const [name, range] of Object.entries(manifest.dependencies)) {
    const min = parse(range.replace(">=", ""));
    const { version } = readJson(join(toolkit, "node_modules", name, "package.json"));
    const actual = parse(version);
    const cmp = actual.map((n, i) => n - min[i]).find((d) => d !== 0) ?? 0;
    assert.ok(cmp >= 0, `${name}@${version} is older than ${range}`);
  }
});

test("only the code-review and simplify skills are bundled", () => {
  const skills = readdirSync(join(toolkit, "skills")).sort();
  assert.deepEqual(skills, ["code-review", "simplify"]);
  for (const name of skills) assert.ok(existsSync(join(toolkit, "skills", name, "SKILL.md")));
});

test("no setup or install hooks modify consuming project settings", () => {
  assert.deepEqual(Object.keys(manifest.scripts), ["test"]);
  assert.equal(existsSync(join(toolkit, "scripts/setup.mjs")), false);
});
