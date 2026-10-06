const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { ESLint } = require("eslint");

const project = path.resolve(
  __dirname,
  "../../../examples/projects/evst-books",
);
const config = path.join(project, "eslint.config.mjs");

async function lint(relativeFile) {
  const eslint = new ESLint({ cwd: project, overrideConfigFile: config });
  const [result] = await eslint.lintFiles([path.join(project, relativeFile)]);
  return result.messages;
}

describe("event usage", () => {
  it("recognizes events emitted by tasks as publications", async () => {
    const messages = await lint("src/app/books/evst/books.events.ts");
    assert.deepEqual(
      messages.filter(
        (message) => message.ruleId === "evst/no-unpublished-events",
      ),
      [],
    );
  });

  it("reports events without a state or task subscription", async () => {
    const messages = await lint("src/app/books/evst/books.events.ts");
    assert.deepEqual(
      messages
        .filter((message) => message.ruleId === "evst/no-unsubscribed-events")
        .map((message) => message.message),
      [
        "Event `loadBook` has no subscriber and can be removed.",
        "Event `searchSuccess` has no subscriber and can be removed.",
        "Event `searchFailure` has no subscriber and can be removed.",
        "Event `addBookSuccess` has no subscriber and can be removed.",
        "Event `addBookFailure` has no subscriber and can be removed.",
        "Event `removeBookSuccess` has no subscriber and can be removed.",
        "Event `removeBookFailure` has no subscriber and can be removed.",
        "Event `loadBooksSuccess` has no subscriber and can be removed.",
        "Event `loadBooksFailure` has no subscriber and can be removed.",
        "Event `enter` has no subscriber and can be removed.",
        "Event `searchQueryChanged` has no subscriber and can be removed.",
        "Event `addBook` has no subscriber and can be removed.",
        "Event `removeBook` has no subscriber and can be removed.",
        "Event `selectBook` has no subscriber and can be removed.",
      ],
    );
  });
});
