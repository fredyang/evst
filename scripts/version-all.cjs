const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const version = process.argv[2];
const semver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

if (!version || !semver.test(version)) {
  throw new Error(
    "Usage: npm run version:all -- <major>.<minor>.<patch> (for example, 0.3.0)",
  );
}

const tag = `v${version}`;
const run = (command, args) =>
  execFileSync(command, args, { stdio: "inherit" });
const output = (command, args) =>
  execFileSync(command, args, { encoding: "utf8" }).trim();

if (output("git", ["status", "--porcelain"])) {
  throw new Error("Versioning requires a clean Git worktree.");
}

if (output("git", ["tag", "--list", tag])) {
  throw new Error(`The Git tag ${tag} already exists.`);
}

// Bump both public packages without creating one tag per workspace.
run("npm", [
  "version",
  version,
  "--workspace",
  "@evst/ngrx",
  "--workspace",
  "@evst/eslint-plugin",
  "--no-git-tag-version",
  "--ignore-scripts",
]);

const store = JSON.parse(readFileSync("packages/ngrx/package.json", "utf8"));
const eslintPlugin = JSON.parse(
  readFileSync("packages/eslint-plugin/package.json", "utf8"),
);
if (store.version !== version || eslintPlugin.version !== version) {
  throw new Error("Both public packages must have the requested version.");
}

run("git", [
  "add",
  "package-lock.json",
  "packages/ngrx/package.json",
  "packages/eslint-plugin/package.json",
]);
run("git", ["commit", "-m", `chore(release): ${tag}`]);
run("git", ["tag", "-a", tag, "-m", tag]);

console.log(`Created release commit and tag ${tag}.`);
