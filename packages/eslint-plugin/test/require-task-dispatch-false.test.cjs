const { it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { ESLint } = require("eslint");
const { parser } = require("typescript-eslint");
const plugin = require("../dist");

it("reports non-event Task outputs using their inferred observable types", async () => {
  const root = path.join(__dirname, "fixtures/task-dispatch");
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.ts"],
        languageOptions: {
          parser,
          parserOptions: { project: path.join(root, "tsconfig.json") },
        },
        plugins: { evst: plugin },
        rules: { "evst/require-task-dispatch-false": "error" },
      },
    ],
  });
  const [result] = await eslint.lintFiles([path.join(root, "tasks.ts")]);
  assert.deepEqual(
    result.messages.map(({ line, messageId }) => ({ line, messageId })),
    [7, 8, 9, 10, 11, 12, 13, 14, 15, 25].map((line) => ({
      line,
      messageId: "nonEventOutput",
    })),
  );
});

it("can run without type information", async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        languageOptions: { parser },
        plugins: { evst: plugin },
        rules: { "evst/require-task-dispatch-false": "error" },
      },
    ],
  });
  const [result] = await eslint.lintText(
    "task((on) => ({ check: on(() => of(true)) }));",
  );
  assert.deepEqual(result.messages, []);
});
