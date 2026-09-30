const { describe, it } = require("node:test");
const { RuleTester } = require("eslint");
const { parser } = require("typescript-eslint");
const {
  default: rule,
  messageId,
} = require("../dist/rules/event-group-source-prefix");

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parser } }).run(
  "event-group-source-prefix",
  rule,
  {
    valid: [
      `const fromBooksApi = events("Books API", {});`,
      `const fromCollectionPage = events("Collection Page", {});`,
      `const fromAPI2 = events("API", {});`,
      `const booksEvents = other("Books", {});`,
    ],
    invalid: [
      {
        code: `const booksEvents = events("Books", {});`,
        errors: [{ messageId, data: { name: "booksEvents" } }],
      },
      {
        code: `const eventsFromApi = events("Books API", {});`,
        errors: [{ messageId, data: { name: "eventsFromApi" } }],
      },
      {
        code: `const frombooksApi = events("Books API", {});`,
        errors: [{ messageId, data: { name: "frombooksApi" } }],
      },
    ],
  },
);
