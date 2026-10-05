import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
export const messageId = "duplicateEventHandler";

type MessageIds = typeof messageId;
type Options = readonly [];

/** Prevents one state definition from handling the same event more than once. */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallows handling the same event more than once in one state definition.",
    },
    schema: [],
    messages: {
      [messageId]:
        "Event `{{ event }}` is already handled by this state definition.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init) return;
        collectHandlers(node.init, new Map());
      },
    };

    function collectHandlers(
      expression: TSESTree.Expression,
      handledEvents: Map<string, TSESTree.Expression>,
    ): boolean {
      if (isStateCall(expression)) return true;
      if (!isFluentCall(expression)) return false;
      if (!collectHandlers(expression.callee.object, handledEvents))
        return false;

      if (expression.callee.property.name === "handle") {
        const [build] = expression.arguments;
        if (build?.type === "ArrowFunctionExpression") {
          collectNamedHandlers(build.body, handledEvents);
        }
        return true;
      }
      if (expression.callee.property.name !== "on") return true;

      addEvents(expression.arguments.slice(0, -1), handledEvents);

      return true;
    }

    function collectNamedHandlers(
      body: TSESTree.Expression | TSESTree.BlockStatement,
      handledEvents: Map<string, TSESTree.Expression>,
    ): void {
      const object =
        body.type === "ObjectExpression"
          ? body
          : body.type === "BlockStatement"
            ? body.body.find(
                (statement): statement is TSESTree.ReturnStatement =>
                  statement.type === "ReturnStatement" &&
                  statement.argument?.type === "ObjectExpression",
              )?.argument
            : undefined;
      if (!object || object.type !== "ObjectExpression") return;

      for (const property of object.properties) {
        if (
          property.type === "Property" &&
          property.value.type === "CallExpression" &&
          property.value.callee.type === "Identifier" &&
          property.value.callee.name === "on"
        ) {
          addEvents(property.value.arguments.slice(0, -1), handledEvents);
        }
      }
    }

    function addEvents(
      events: readonly TSESTree.CallExpressionArgument[],
      handledEvents: Map<string, TSESTree.Expression>,
    ): void {
      for (const event of events) {
        if (event.type === "SpreadElement") continue;
        const eventName = context.sourceCode.getText(event);
        if (handledEvents.has(eventName)) {
          context.report({
            node: event,
            messageId,
            data: { event: eventName },
          });
          continue;
        }
        handledEvents.set(eventName, event);
      }
    }
  },
});

function isStateCall(node: TSESTree.Expression): boolean {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "state"
  );
}

function isFluentCall(
  node: TSESTree.Expression,
): node is TSESTree.CallExpression & {
  callee: TSESTree.MemberExpression & { property: TSESTree.Identifier };
} {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.type === "Identifier"
  );
}
