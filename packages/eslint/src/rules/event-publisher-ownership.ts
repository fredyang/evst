import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
const messageId = "multiplePublishers";

export default createRule<readonly [], typeof messageId>({
  meta: {
    type: "suggestion",
    docs: {
      description: "Ensures an event has one publishing call site per file.",
    },
    schema: [],
    messages: {
      [messageId]:
        "Event `{{ event }}` is published more than once in this file. Publish it from one boundary, or model the shared operation as a service command.",
    },
  },
  defaultOptions: [],
  create: (context) => {
    const publishers = new Set<string>();

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== "MemberExpression" ||
          node.callee.computed ||
          node.callee.property.type !== "Identifier" ||
          node.callee.property.name !== "publish"
        ) {
          return;
        }
        const event = memberName(node.callee.object);
        if (!event) return;
        if (publishers.has(event)) {
          context.report({ node, messageId, data: { event } });
          return;
        }
        publishers.add(event);
      },
    };
  },
});

function memberName(node: TSESTree.Expression): string | undefined {
  if (node.type === "Identifier") return node.name;
  if (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier"
  ) {
    const parent = memberName(node.object);
    return parent ? `${parent}.${node.property.name}` : undefined;
  }
  return undefined;
}
