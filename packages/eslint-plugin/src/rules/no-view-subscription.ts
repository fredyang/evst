import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
export const messageId = "viewSubscription";

type MessageIds = typeof messageId;
type Options = readonly [];

/** Prefers Angular-managed View consumption over manual subscriptions. */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Discourages manually subscribing to Observables created by EVST views.",
    },
    schema: [],
    messages: {
      [messageId]:
        "Prefer `.signal()` or bind `.observable()` with AsyncPipe. Manual subscriptions are appropriate for imperative integrations; use automatic teardown and document the reason.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isViewSubscription(node)) return;
        context.report({ node, messageId });
      },
    };
  },
});

function isViewSubscription(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "subscribe" &&
    originatesFromViewObservable(node.callee.object)
  );
}

function originatesFromViewObservable(
  expression: TSESTree.Expression,
): boolean {
  if (expression.type === "ChainExpression") {
    return originatesFromViewObservable(expression.expression);
  }
  if (expression.type !== "CallExpression") return false;
  if (
    expression.callee.type !== "MemberExpression" ||
    expression.callee.computed ||
    expression.callee.property.type !== "Identifier"
  ) {
    return false;
  }

  const method = expression.callee.property.name;
  if (method === "observable") {
    return isViewReference(expression.callee.object);
  }
  return (
    method === "pipe" && originatesFromViewObservable(expression.callee.object)
  );
}

function isViewReference(expression: TSESTree.Expression): boolean {
  if (expression.type === "Identifier") {
    return /views?$/i.test(expression.name);
  }
  if (expression.type !== "MemberExpression" || expression.computed) {
    return false;
  }
  if (
    expression.property.type === "Identifier" &&
    expression.property.name === "views"
  ) {
    return true;
  }
  return isViewReference(expression.object);
}
