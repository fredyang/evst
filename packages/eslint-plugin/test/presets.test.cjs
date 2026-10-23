const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { ESLint } = require("eslint");
const { defineConfig } = require("eslint/config");
const { parser } = require("typescript-eslint");
const evst = require("../dist");

for (const preset of ["rtk", "evst-ngrx"]) {
  describe(`${preset} registration`, () => {
    it("registers itself through extends and preserves rule overrides", async () => {
      assert.equal(evst.configs[preset].plugins.evst, evst);
      for (const severity of ["warn", "error"]) {
        const eslint = new ESLint({
          overrideConfigFile: true,
          overrideConfig: defineConfig([
            {
              files: ["**/*.ts"],
              languageOptions: { parser },
              extends: [evst.configs[preset]],
              rules: { "evst/event-group-source-prefix": severity },
            },
          ]),
        });
        const [result] = await eslint.lintText(
          'const booksEvents = events("Books API", {});',
          { filePath: "books.ts" },
        );
        assert.ok(
          result.messages.some(
            (message) =>
              message.ruleId === "evst/event-group-source-prefix" &&
              message.severity === (severity === "warn" ? 1 : 2),
          ),
        );
      }
    });
  });
}
