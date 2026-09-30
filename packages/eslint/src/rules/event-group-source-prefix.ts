import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
export const messageId = "missingSourcePrefix";
const sourcePrefix = /^from[A-Z][A-Za-z0-9]*$/;

/** Makes the authoritative source of each event group visible in its name. */
export default createRule<readonly [], typeof messageId>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Requires event groups created with events() to use a fromXxx source name.",
    },
    schema: [],
    messages: {
      [messageId]:
        "Event groups must use a `fromXxx` name that identifies their authoritative source. Rename `{{ name }}` to a source-oriented name such as `fromBooksApi`.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!isEventsCall(node.init) || node.id.type !== "Identifier") return;
        if (sourcePrefix.test(node.id.name)) return;

        context.report({
          node: node.id,
          messageId,
          data: { name: node.id.name },
        });
      },
    };
  },
});

function isEventsCall(
  node: TSESTree.Expression | null,
): node is TSESTree.CallExpression {
  return (
    node?.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "events"
  );
}
