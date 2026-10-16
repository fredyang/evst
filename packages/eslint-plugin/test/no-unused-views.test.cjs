const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { ESLint } = require("eslint");

const project = path.resolve(
  __dirname,
  "../../../examples/projects/evst-ngrx-books",
);
const file = path.join(project, "src/app/auth/evst/auth.evst.ts");

describe("no-unused-views", () => {
  it("recognizes direct feature view usage as well as exported aliases", async () => {
    const eslint = new ESLint({
      cwd: project,
      overrideConfigFile: path.join(project, "eslint.config.mjs"),
    });
    const [result] = await eslint.lintFiles([file]);

    assert.deepEqual(
      result.messages
        .filter((message) => message.ruleId === "evst/no-unused-views")
        .map((message) => message.message),
      [],
    );
  });
});
