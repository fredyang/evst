const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

/**
 * Prepares an independently versioned package release.
 *
 * Usage:
 *   npm run release -- eslint-plugin patch
 *   npm run release -- ngrx-store minor
 *   npm run release -- rtk 1.0.0
 *
 * Supported package aliases are `eslint-plugin`, `ngrx-store`, and `rtk`.
 * The release argument can be `major`, `minor`, `patch`, or an exact semantic
 * version. A clean Git worktree is required.
 *
 * The script tests the selected package, updates its version and the lockfile,
 * builds it, checks its package contents with `npm pack --dry-run`, commits the
 * version changes, and creates an annotated package-specific Git tag such as
 * `@evst/eslint-plugin@0.5.4`. It does not publish or push anything.
 *
 * After inspecting the generated commit and tag, publish and push separately:
 *   npm publish --workspace @evst/eslint-plugin --access public
 *   git push --follow-tags
 *
 * The workspace name in the publish command must match the released package.
 */

const packages = {
  "eslint-plugin": {
    name: "@evst/eslint-plugin",
    manifest: "packages/eslint-plugin/package.json",
  },
  "ngrx-store": {
    name: "@evst/ngrx-store",
    manifest: "packages/ngrx/package.json",
  },
  rtk: {
    name: "@evst/rtk",
    manifest: "packages/rtk/package.json",
  },
};

const [packageAlias, release] = process.argv.slice(2);
const selected = packages[packageAlias];
const semver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

if (
  !selected ||
  !release ||
  (!["major", "minor", "patch"].includes(release) && !semver.test(release))
) {
  throw new Error(
    "Usage: npm run release -- <eslint-plugin|ngrx-store|rtk> <major|minor|patch|version>",
  );
}

const run = (command, args) =>
  execFileSync(command, args, { stdio: "inherit" });
const output = (command, args) =>
  execFileSync(command, args, { encoding: "utf8" }).trim();
const manifest = () => JSON.parse(readFileSync(selected.manifest, "utf8"));

if (output("git", ["status", "--porcelain"])) {
  throw new Error("Preparing a release requires a clean Git worktree.");
}

const nextVersion = resolveVersion(manifest().version, release);
const tag = `${selected.name}@${nextVersion}`;
if (output("git", ["tag", "--list", tag])) {
  throw new Error(`The Git tag ${tag} already exists.`);
}

run("npm", ["test", "--workspace", selected.name]);
if (output("git", ["status", "--porcelain"])) {
  throw new Error(
    "Tests changed tracked files; the release was not versioned.",
  );
}

run("npm", [
  "version",
  release,
  "--workspace",
  selected.name,
  "--no-git-tag-version",
]);
if (manifest().version !== nextVersion) {
  throw new Error(
    `Expected ${selected.name} to be versioned as ${nextVersion}.`,
  );
}

run("npm", ["run", "build", "--workspace", selected.name]);
run("npm", ["pack", "--workspace", selected.name, "--dry-run"]);

// Preserve the two leading porcelain status columns before extracting paths.
// The general output helper trims them from entries such as " M package.json".
const changedFiles = execFileSync("git", ["status", "--porcelain"], {
  encoding: "utf8",
})
  .trimEnd()
  .split("\n")
  .filter(Boolean)
  .map((line) => line.slice(3));
const expectedFiles = new Set(["package-lock.json", selected.manifest]);
const unexpectedFiles = changedFiles.filter((file) => !expectedFiles.has(file));
if (unexpectedFiles.length) {
  throw new Error(
    `Release checks changed unexpected tracked files:\n${unexpectedFiles.join("\n")}`,
  );
}

run("git", ["add", "package-lock.json", selected.manifest]);
run("git", ["commit", "-m", `chore(release): ${tag}`]);
run("git", ["tag", "-a", tag, "-m", tag]);

console.log(`Prepared ${tag}.`);
console.log(
  `Publish with: npm publish --workspace ${selected.name} --access public`,
);
console.log("Then push with: git push --follow-tags");

function resolveVersion(current, requested) {
  if (semver.test(requested)) return requested;
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(current);
  if (!match)
    throw new Error(`Current version ${current} is not valid semver.`);
  let [, major, minor, patch] = match.map(Number);
  if (requested === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (requested === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}
