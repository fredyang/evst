const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { ESLint } = require("eslint");
const { parser } = require("typescript-eslint");
const evst = require("../dist");

describe("RTK preset", () => {
  it("reports repeated publications in a React event callback", async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ["**/*.tsx"],
          languageOptions: { parser },
          plugins: { evst },
          ...evst.configs.rtk,
        },
      ],
    });
    const [result] = await eslint.lintText(
      `import { events, emptyProps } from "@evst/rtk";
       const fromBooksPage = events("Books Page", { entered: emptyProps() });
       export const BooksPage = () => <button onClick={() => {
         fromBooksPage.entered.publish();
         fromBooksPage.entered.publish();
       }}>Books</button>;`,
      { filePath: "books.tsx" },
    );
    assert.deepEqual(result.messages.map(({ ruleId }) => ruleId).sort(), [
      "evst/event-publisher-ownership",
      "evst/event-publisher-ownership",
      "evst/no-sequential-event-publishes",
    ]);
  });

  it("includes shared rules without Angular-only rules and preserves legacy presets", () => {
    assert.deepEqual(evst.configs.rtk.rules, evst.configs.core.rules);
    assert.equal(
      evst.configs.rtk.rules["evst/no-duplicate-event-handlers"],
      "warn",
    );
    assert.equal(
      evst.configs.rtk.rules["evst/no-view-subscription"],
      undefined,
    );
    assert.equal(evst.configs.rtk.rules["evst/require-task-event"], undefined);
    assert.equal(evst.configs.evst.rules["evst/no-view-subscription"], "warn");
    assert.equal(
      evst.configs.ngrx.rules["evst/event-group-source-prefix"],
      undefined,
    );
    assert.deepEqual(evst.configs["evst-ngrx"].rules, {
      ...evst.configs.evst.rules,
      "evst/no-duplicate-event-handlers": "warn",
    });
  });

  it("tracks TSX hooks, state handlers and async returned outcomes across files", async () => {
    const cwd = path.join(__dirname, "fixtures/rtk");
    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ["**/*.{ts,tsx}"],
          languageOptions: {
            parser,
            parserOptions: {
              project: "./tsconfig.json",
              tsconfigRootDir: cwd,
            },
          },
          plugins: { evst },
          ...evst.configs.rtk,
        },
      ],
    });
    const results = await eslint.lintFiles(["books.ts", "page.tsx"]);
    assert.deepEqual(
      results.flatMap((result) =>
        result.messages.map(({ ruleId, message }) => ({ ruleId, message })),
      ),
      [
        {
          ruleId: "evst/no-unpublished-events",
          message: "Event `unused` is never published and can be removed.",
        },
        {
          ruleId: "evst/no-unsubscribed-events",
          message: "Event `unused` has no subscriber and can be removed.",
        },
        {
          ruleId: "evst/no-unused-views",
          message: "View `unused` is not referenced and can be removed.",
        },
      ],
    );
  });
});
