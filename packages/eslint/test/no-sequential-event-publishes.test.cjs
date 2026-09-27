const { describe, it } = require("node:test");
const { RuleTester } = require("eslint");
const { parser } = require("typescript-eslint");
const {
  default: rule,
  messageId,
} = require("../dist/rules/no-sequential-event-publishes");

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parser } }).run(
  "no-sequential-event-publishes",
  rule,
  {
    valid: [
      `function load() { BooksEvents.loaded.publish(); }`,
      `function load() { BooksEvents.loaded.publish(); } function retry() { BooksEvents.retry.publish(); }`,
      `function load() { BooksEvents.loaded.publish(); return () => BooksEvents.retry.publish(); }`,
      `BooksEvents.loaded.publish();`,
    ],
    invalid: [
      {
        code: `function load() { BooksEvents.loaded.publish(); BooksEvents.saved.publish(); }`,
        errors: [{ messageId }],
      },
      {
        code: `const load = () => { BooksEvents.loaded.publish(); BooksEvents.saved.publish(); BooksEvents.closed.publish(); };`,
        errors: [{ messageId }, { messageId }],
      },
      {
        code: `BooksEvents.loaded.publish(); BooksEvents.saved.publish();`,
        errors: [{ messageId }],
      },
    ],
  },
);
