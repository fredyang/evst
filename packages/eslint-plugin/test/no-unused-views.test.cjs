const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { ESLint } = require("eslint");

const project = path.resolve(
  __dirname,
  "../../../examples/projects/evst-books",
);
const file = path.join(project, "src/app/auth/evst/auth.state.ts");

describe("no-unused-views", () => {
  it("reports the unreferenced auth user view", async () => {
    const eslint = new ESLint({
      cwd: project,
      overrideConfigFile: path.join(project, "eslint.config.mjs"),
    });
    const [result] = await eslint.lintFiles([file]);

    assert.deepEqual(
      result.messages
        .filter((message) => message.ruleId === "evst/no-unused-views")
        .map((message) => message.message),
      ["View `user` is not referenced and can be removed."],
    );
  });
});
