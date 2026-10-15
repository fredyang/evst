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
