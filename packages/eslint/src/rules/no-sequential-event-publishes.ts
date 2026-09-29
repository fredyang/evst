import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
export const messageId = "multipleEventPublishes";

type MessageIds = typeof messageId;
type Options = readonly [];

/**
 * An executable boundary represents one command. Multiple event publications
 * from that boundary turn events into an imperative command sequence.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallows publishing more than one event from an executable boundary.",
    },
    schema: [],
    messages: {
      [messageId]:
        "Publish one event per executable boundary. Model this sequence as a service command instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    const publishes = new Map<TSESTree.Node, number>();
    const boundaries: TSESTree.Node[] = [context.sourceCode.ast];

    function enterBoundary(node: TSESTree.Node): void {
      boundaries.push(node);
    }

    function leaveBoundary(): void {
      boundaries.pop();
    }

    return {
      FunctionDeclaration: enterBoundary,
      FunctionExpression: enterBoundary,
      ArrowFunctionExpression: enterBoundary,
      "FunctionDeclaration:exit": leaveBoundary,
      "FunctionExpression:exit": leaveBoundary,
      "ArrowFunctionExpression:exit": leaveBoundary,
      CallExpression(node: TSESTree.CallExpression) {
        if (!isPublicationCall(node)) return;

        const boundary = boundaries.at(-1);
        if (!boundary) return;
        const count = (publishes.get(boundary) ?? 0) + 1;
        publishes.set(boundary, count);

        if (count > 1) {
          context.report({ node, messageId });
        }
      },
    };
  },
});

function isPublicationCall(node: TSESTree.CallExpression): boolean {
  if (
    node.callee.type !== "MemberExpression" ||
    node.callee.computed ||
    node.callee.property.type !== "Identifier"
  )
    return false;
  if (node.callee.property.name === "publish") return true;
  return (
    node.callee.property.name === "dispatch" &&
    node.arguments[0]?.type === "CallExpression"
  );
}
