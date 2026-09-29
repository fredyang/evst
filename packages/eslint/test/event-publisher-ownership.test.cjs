const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { RuleTester, Linter } = require("eslint");
const { parser } = require("typescript-eslint");
const ts = require("typescript");
const rule = require("../dist/rules/event-publisher-ownership").default;

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parser } }).run(
  "event-publisher-ownership",
  rule,
  {
    valid: [
      "BooksPageEvents.loaded.publish(); BooksPageEvents.bookSelected.publish({ id: '42' });",
      "events.entered(); events.entered.publish();",
      "store.dispatch(BooksPageActions.loaded()); store.dispatch(BooksPageActions.selected());",
    ],
    invalid: [
      {
        code: "store.dispatch(BooksPageActions.entered());\nstore.dispatch(BooksPageActions.entered());",
        errors: [1, 2].map((line) => ({
          messageId: "multiplePublishers",
          line,
          data: {
            event: "BooksPageActions.entered",
            publishers: "<input>:1:1\n<input>:2:1",
          },
        })),
      },
      {
        code: "BooksPageEvents.entered.publish();\nBooksPageEvents.entered.publish();",
        errors: [1, 2].map((line) => ({
          messageId: "multiplePublishers",
          line,
          data: {
            event: "BooksPageEvents.entered",
            publishers: "<input>:1:1\n<input>:2:1",
          },
        })),
      },
    ],
  },
);

// A fresh in-memory program models each editor project snapshot, including edits.
function project(sources) {
  const files = new Map(
    Object.entries(sources).map(([name, source]) => [
      path.join(__dirname, name),
      source,
    ]),
  );
  const options = {
    noLib: true,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
  };
  const host = ts.createCompilerHost(options);
  const originalFileExists = host.fileExists;
  const originalReadFile = host.readFile;
  host.fileExists = (filename) =>
    files.has(filename) || originalFileExists(filename);
  host.readFile = (filename) =>
    files.get(filename) ?? originalReadFile(filename);
  host.getSourceFile = (filename, languageVersion) => {
    const text = host.readFile(filename);
    return text === undefined
      ? undefined
      : ts.createSourceFile(filename, text, languageVersion, true);
  };
  const program = ts.createProgram([...files.keys()], options, host);
  const linter = new Linter();
  return (filename) =>
    linter.verify(
      sources[filename],
      [
        {
          files: ["**/*.ts"],
          languageOptions: { parser, parserOptions: { programs: [program] } },
          plugins: { sugar: { rules: { ownership: rule } } },
          rules: { "sugar/ownership": "warn" },
        },
      ],
      { filename: path.join(__dirname, filename) },
    );
}

const events = "export const events = { enter: { publish() {} } };";
const sources = {
  "events.ts": events,
  "collection-page.ts":
    'import { events } from "./events";\nevents.enter.publish();',
  "find-book-page.ts":
    'import { events as renamed } from "./events";\nrenamed.enter.publish();',
};

const nativeSources = {
  "actions.ts":
    "export const actions = { enter() { return { type: 'enter' }; } };",
  "collection-page.ts":
    'import { actions } from "./actions"; declare const store: { dispatch(action: unknown): void }; store.dispatch(actions.enter());',
  "find-book-page.ts":
    'import { actions as renamed } from "./actions"; declare const store: { dispatch(action: unknown): void }; store.dispatch(renamed.enter());',
};

it("reports both publishers regardless of lint order, including aliased imports", () => {
  for (const order of [
    ["collection-page.ts", "find-book-page.ts"],
    ["find-book-page.ts", "collection-page.ts"],
  ]) {
    const lint = project(sources);
    for (const file of order) {
      const messages = lint(file);
      assert.equal(messages.length, 1);
      assert.equal(messages[0].messageId, "multiplePublishers");
      assert.equal(messages[0].line, 2);
      assert.equal(messages[0].column, 1);
      assert.match(messages[0].message, /collection-page\.ts:2:1/);
      assert.match(messages[0].message, /find-book-page\.ts:2:1/);
      assert.doesNotMatch(messages[0].message, /file:\/\/|\]\(/);
    }
  }
});

it("lists all three publishers even when only one file is linted", () => {
  const lint = project({
    ...sources,
    "third-page.ts": sources["collection-page.ts"],
  });
  const [message] = lint("collection-page.ts");
  assert.match(message.message, /collection-page\.ts:2:1/);
  assert.match(message.message, /find-book-page\.ts:2:1/);
  assert.match(message.message, /third-page\.ts:2:1/);
});

it("clears both diagnostics after either publisher is removed", () => {
  for (const removed of ["collection-page.ts", "find-book-page.ts"]) {
    const before = project(sources);
    assert.equal(before("collection-page.ts").length, 1);
    assert.equal(before("find-book-page.ts").length, 1);
    const after = project({ ...sources, [removed]: "export {};" });
    assert.deepEqual(after("collection-page.ts"), []);
    assert.deepEqual(after("find-book-page.ts"), []);
  }
});

it("does not confuse unrelated events with identical local names", () => {
  const lint = project({
    "one.ts":
      "const events = { enter: { publish() {} } }; events.enter.publish(); export {};",
    "two.ts":
      "const events = { enter: { publish() {} } }; events.enter.publish(); export {};",
  });
  assert.deepEqual(lint("one.ts"), []);
  assert.deepEqual(lint("two.ts"), []);
});

it("reports native action creators dispatched through aliased imports", () => {
  const lint = project(nativeSources);
  for (const file of ["collection-page.ts", "find-book-page.ts"]) {
    const [message] = lint(file);
    assert.equal(message.messageId, "multiplePublishers");
    assert.match(message.message, /collection-page\.ts:1:/);
    assert.match(message.message, /find-book-page\.ts:1:/);
  }
});
