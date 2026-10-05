import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
export const messageId = "eventlessTask";

type MessageIds = typeof messageId;
type Options = readonly [];

/**
 * Tasks are normally event handlers. Source tasks subscribe as soon as their
 * effects are provided, so their lifecycle should be an explicit exception.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Requires tasks to subscribe to an event unless explicitly suppressed.",
    },
    schema: [],
    messages: {
      [messageId]:
        "This task has no event source and starts when its effects are provided. Use an event-driven task, or suppress this warning with a reason.",
    },
  },
  defaultOptions: [],
  create(context) {
    const taskBuilders = new Set<
      TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
    >();

    return {
      CallExpression(node) {
        if (!isTaskHandleCall(node)) return;

        const [builder] = node.arguments;
        if (
          builder?.type === "ArrowFunctionExpression" ||
          builder?.type === "FunctionExpression"
        ) {
          taskBuilders.add(builder);
        }
      },
      "CallExpression:exit"(node) {
        if (!isTaskHandleCall(node)) return;

        const [builder] = node.arguments;
        if (
          builder?.type === "ArrowFunctionExpression" ||
          builder?.type === "FunctionExpression"
        ) {
          taskBuilders.delete(builder);
        }
      },
      "CallExpression[callee.type='Identifier'][callee.name='on']"(
        node: TSESTree.CallExpression,
      ) {
        if (!isTaskBuilderCall(node, taskBuilders)) return;
        if (!isEventlessTask(node)) return;

        context.report({ node, messageId });
      },
    };
  },
});

function isTaskHandleCall(node: TSESTree.CallExpression): boolean {
  return (
    (node.callee.type === "Identifier" && node.callee.name === "tasks") ||
    (node.callee.type === "MemberExpression" &&
      !node.callee.computed &&
      node.callee.object.type === "Identifier" &&
      node.callee.object.name === "task" &&
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === "handle")
  );
}

function isTaskBuilderCall(
  node: TSESTree.CallExpression,
  taskBuilders: ReadonlySet<
    TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
  >,
): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (taskBuilders.has(current as TSESTree.ArrowFunctionExpression)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isEventlessTask(node: TSESTree.CallExpression): boolean {
  const [source, options] = node.arguments;
  if (!source || source.type === "SpreadElement") return false;

  return (
    node.arguments.length === 1 ||
    (node.arguments.length === 2 && options?.type === "ObjectExpression")
  );
}
