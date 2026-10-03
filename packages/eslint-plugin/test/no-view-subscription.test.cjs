const { describe, it } = require("node:test");
const { RuleTester } = require("eslint");
const { parser } = require("typescript-eslint");
const {
  default: rule,
  messageId,
} = require("../dist/rules/no-view-subscription");
const {
  default: suppressionReasonRule,
  messageId: suppressionReasonMessageId,
} = require("../dist/rules/no-view-subscription-suppression-reason");

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parser } }).run(
  "no-view-subscription",
  rule,
  {
    valid: [
      `booksViews.loading.signal();`,
      `booksViews.loading.observable();`,
      `service.observable().subscribe(render);`,
      `booksViews.loading.observable().pipe(map(Boolean));`,
    ],
    invalid: [
      {
        code: `booksViews.loading.observable().subscribe(render);`,
        errors: [{ messageId }],
      },
      {
        code: `booksViews.loading.observable().pipe(distinctUntilChanged()).subscribe(render);`,
        errors: [{ messageId }],
      },
    ],
  },
);

new RuleTester({
  languageOptions: { parser },
  plugins: { evst: { rules: { "no-view-subscription": rule } } },
}).run("no-view-subscription-suppression-reason", suppressionReasonRule, {
  valid: [
    `// eslint-disable-next-line evst/no-view-subscription -- Updates a third-party widget.\nbooksViews.loading.observable().subscribe(render);`,
    `// eslint-disable-next-line no-console\nconsole.log("allowed");`,
  ],
  invalid: [
    {
      code: `// eslint-disable-next-line evst/no-view-subscription\nbooksViews.loading.observable().subscribe(render);`,
      errors: [{ messageId: suppressionReasonMessageId }],
    },
  ],
});
