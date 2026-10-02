const { describe, it } = require("node:test");
const { RuleTester } = require("eslint");
const { parser } = require("typescript-eslint");
const {
  default: rule,
  messageId,
} = require("../dist/rules/no-duplicate-event-handlers");

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parser } }).run(
  "no-duplicate-event-handlers",
  rule,
  {
    valid: [
      `const booksState = state("books", {}).on(BooksEvents.loaded, state => state).on(BooksEvents.refreshed, state => state);`,
      `const booksState = state("books", {}).on(BooksEvents.loaded, BooksEvents.refreshed, state => state);`,
      `const task = on(BooksEvents.loaded, () => {});`,
      `const next = booksState.on(BooksEvents.loaded, state => state);`,
    ],
    invalid: [
      {
        code: `const booksState = state("books", {}).on(BooksEvents.loaded, state => state).on(BooksEvents.loaded, state => state);`,
        errors: [{ messageId, data: { event: "BooksEvents.loaded" } }],
      },
      {
        code: `const booksState = state("books", {}).on(BooksEvents.loaded, state => state).withViews(() => ({})).on(BooksEvents.loaded, state => state);`,
        errors: [{ messageId, data: { event: "BooksEvents.loaded" } }],
      },
      {
        code: `const booksState = state("books", {}).on(BooksEvents.loaded, BooksEvents.loaded, state => state);`,
        errors: [{ messageId, data: { event: "BooksEvents.loaded" } }],
      },
    ],
  },
);
