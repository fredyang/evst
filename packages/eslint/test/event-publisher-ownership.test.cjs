const { describe, it } = require("node:test");
const { RuleTester } = require("eslint");
const { parser } = require("typescript-eslint");
const rule = require("../dist/rules/event-publisher-ownership").default;

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parser } }).run(
  "event-publisher-ownership",
  rule,
  {
    valid: [
      "BooksPageEvents.entered.publish(); BooksPageEvents.bookSelected.publish({ id: '42' });",
      "events.entered(); events.entered.publish();",
    ],
    invalid: [
      {
        code: "BooksPageEvents.entered.publish(); BooksPageEvents.entered.publish();",
        errors: [
          {
            messageId: "multiplePublishers",
            data: { event: "BooksPageEvents.entered" },
          },
        ],
      },
    ],
  },
);
