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

  it("exposes only the two EVST framework presets", () => {
    assert.deepEqual(Object.keys(evst.configs).sort(), ["evst-ngrx", "rtk"]);
    assert.equal(
      evst.configs.rtk.rules["evst/no-duplicate-event-handlers"],
      "warn",
    );
    assert.equal(
      evst.configs.rtk.rules["evst/no-view-subscription"],
      undefined,
    );
    assert.equal(evst.configs.rtk.rules["evst/require-task-event"], undefined);
    for (const [name, severity] of Object.entries(evst.configs.rtk.rules)) {
      assert.equal(evst.configs["evst-ngrx"].rules[name], severity);
    }
    assert.equal(
      evst.configs["evst-ngrx"].rules["evst/no-view-subscription"],
      "warn",
    );
    assert.equal(
      evst.configs["evst-ngrx"].rules["evst/require-task-event"],
      "warn",
    );
    assert.equal(
      evst.configs["evst-ngrx"].rules["evst/require-task-dispatch-false"],
      "error",
    );
  });

  it("recognizes NgRx state and both task forms, including callback View usage", async () => {
    const cwd = path.join(__dirname, "fixtures/rtk");
    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ["**/*.ts"],
          languageOptions: {
            parser,
            parserOptions: { project: "./tsconfig.json", tsconfigRootDir: cwd },
          },
          ...evst.configs["evst-ngrx"],
        },
      ],
    });
    const [result] = await eslint.lintFiles(["ngrx.ts"]);
    assert.deepEqual(
      result.messages.map(({ ruleId, message }) => ({ ruleId, message })),
      [
        {
          ruleId: "evst/no-unused-views",
          message: "View `unused` is not referenced and can be removed.",
        },
      ],
    );
  });

  it("tracks RTK state, standalone and fluent task, callback Views, hooks and conditional publications", async () => {
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
          ruleId: "evst/no-unsubscribed-events",
          message: "Event `added` has no subscriber and can be removed.",
        },
        {
          ruleId: "evst/no-unsubscribed-events",
          message: "Event `removed` has no subscriber and can be removed.",
        },
        {
          ruleId: "evst/no-unpublished-events",
          message: "Event `checked` is never published and can be removed.",
        },
        {
          ruleId: "evst/no-unsubscribed-events",
          message: "Event `checked` has no subscriber and can be removed.",
        },
        {
          ruleId: "evst/no-unused-views",
          message: "View `unused` is not referenced and can be removed.",
        },
      ],
    );
  });
});
