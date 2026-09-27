import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
const actionCreator = `CallExpression[callee.name='createAction']`;

export const messageId = "eventHygiene";

type MessageIds = typeof messageId;
type Options = readonly [];

export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description: "Ensures event actions declare a nonempty source.",
    },
    schema: [],
    messages: {
      [messageId]:
        'Event type `{{ eventType }}` must include a nonempty "[Source]" prefix.',
    },
  },
  defaultOptions: [],
  create: (context) => {
    const sourceEventPattern = /^\[[^\]\r\n[]*\S[^\]\r\n[]*\] +\S[\s\S]*$/;

    function checkActionType(node: TSESTree.Node, eventType: string) {
      if (sourceEventPattern.test(eventType)) {
        return;
      }

      context.report({ node, messageId, data: { eventType } });
    }

    return {
      [`${actionCreator}[arguments.0.type='Literal']`]({
        arguments: [node],
      }: Omit<TSESTree.CallExpression, "arguments"> & {
        arguments: TSESTree.StringLiteral[];
      }) {
        const { value: actionType } = node;

        if (typeof actionType !== "string") {
          return;
        }

        checkActionType(node, actionType);
      },
      "CallExpression[callee.name='events']"(node: TSESTree.CallExpression) {
        const [source] = node.arguments;
        if (source?.type !== "Literal" || typeof source.value !== "string") {
          return;
        }
        if (source.value.trim()) {
          return;
        }
        context.report({ node: source, messageId, data: { eventType: "[]" } });
      },
    };
  },
});
