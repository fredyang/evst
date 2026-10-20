const { before, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { ESLint } = require("eslint");

const project = path.resolve(
  __dirname,
  "../../../examples/projects/evst-ngrx-books",
);
const config = path.join(project, "eslint.config.mjs");

async function lint(relativeFile) {
  const eslint = new ESLint({ cwd: project, overrideConfigFile: config });
  const [result] = await eslint.lintFiles([path.join(project, relativeFile)]);
  return result.messages;
}

describe("event usage", () => {
  let messages;

  before(async () => {
    // In CI, repeated parsing of one file can produce an isolated TypeScript
    // program for autofix passes, hiding subscriptions in other project files.
    messages = await lint("src/app/books/evst/books.events.ts");
  });

  it("recognizes events emitted by Tasks as publications", () => {
    assert.deepEqual(
      messages.filter(
        (message) => message.ruleId === "evst/no-unpublished-events",
      ),
      [],
    );
  });

  it("reports events without a state or task subscription", () => {
    assert.deepEqual(
      messages
        .filter((message) => message.ruleId === "evst/no-unsubscribed-events")
        .map((message) => message.message),
      [
        "Event `addBookSuccess` has no subscriber and can be removed.",
        "Event `removeBookSuccess` has no subscriber and can be removed.",
        "Event `loadBooksFailure` has no subscriber and can be removed.",
      ],
    );
  });
});

it("recognizes imported groups as Task subscriptions without treating state groups as supported", () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const ts = require("typescript");
  const {
    findEventDeclarations,
    isGroupSubscription,
  } = require("../dist/rules/event-usage");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "evst-group-"));
  try {
    const definitions = path.join(dir, "events.ts");
    const consumer = path.join(dir, "tasks.ts");
    fs.writeFileSync(
      definitions,
      `declare function events(source: string, config: any): any;
      export const fromPage = events("Page", { entered: {}, changed: {} });`,
    );
    fs.writeFileSync(
      consumer,
      `import { fromPage as page } from "./events";
      declare const task: any; declare const state: any;
      task((on) => ({ track: on(page, () => {}, { dispatch: false }) }));
      state.state((on) => ({ invalid: on(page, () => {}) }));`,
    );
    const program = ts.createProgram([definitions, consumer], { noLib: true });
    const checker = program.getTypeChecker();
    const [declaration] = findEventDeclarations(
      program.getSourceFile(definitions),
      checker,
    );
    const matches = [];
    program.getSourceFile(consumer).forEachChild(function visit(node) {
      if (
        ts.isIdentifier(node) &&
        node.text === "page" &&
        ts.isCallExpression(node.parent)
      ) {
        matches.push(isGroupSubscription(node, checker, declaration));
      }
      ts.forEachChild(node, visit);
    });
    assert.deepEqual(matches, [true, false]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
