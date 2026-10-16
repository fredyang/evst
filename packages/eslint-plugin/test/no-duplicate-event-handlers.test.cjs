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
      `const booksState = evst("books", {}).state(on => ({ handle: on(BooksEvents.loaded, state => state) })).state(on => ({ refresh: on(BooksEvents.refreshed, state => state) }));`,
      `const booksState = evst("books", {}).state(on => ({ handle: on(BooksEvents.loaded, BooksEvents.refreshed, state => state) }));`,
      `const task = on(BooksEvents.loaded, () => {});`,
      `const next = booksState.state(on => ({ handle: on(BooksEvents.loaded, state => state) }));`,
      `const booksState = evst("books", {}).state(on => ({ first: on(BooksEvents.loaded, state => state), second: on(BooksEvents.refreshed, state => state) }));`,
    ],
    invalid: [
      {
        code: `const booksState = evst("books", {}).state(on => ({ handle: on(BooksEvents.loaded, state => state) })).state(on => ({ other: on(BooksEvents.loaded, state => state) }));`,
        errors: [{ messageId, data: { event: "BooksEvents.loaded" } }],
      },
      {
        code: `const booksState = evst("books", {}).state(on => ({ handle: on(BooksEvents.loaded, state => state) })).view(() => ({})).state(on => ({ other: on(BooksEvents.loaded, state => state) }));`,
        errors: [{ messageId, data: { event: "BooksEvents.loaded" } }],
      },
      {
        code: `const booksState = evst("books", {}).state(on => ({ handle: on(BooksEvents.loaded, BooksEvents.loaded, state => state) }));`,
        errors: [{ messageId, data: { event: "BooksEvents.loaded" } }],
      },
      {
        code: `const booksState = evst("books", {}).state(on => ({ first: on(BooksEvents.loaded, state => state), second: on(BooksEvents.loaded, state => state) }));`,
        errors: [{ messageId, data: { event: "BooksEvents.loaded" } }],
      },
    ],
  },
);
