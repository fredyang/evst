import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
export const messageId = "missingSuppressionReason";

type MessageIds = typeof messageId;
type Options = readonly [];
const ruleName = "ngrx-eventify/require-task-event";
const directivePattern = new RegExp(
  `eslint-(?:disable(?:-next-line|-line)?|enable)\\s+[^\\n]*\\b${ruleName}\\b`,
);
const descriptionPattern = /\s--\s+\S/;

/** Requires documented exceptions to the event-driven task policy. */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Requires a reason when suppressing the event-driven task requirement.",
    },
    schema: [],
    messages: {
      [messageId]:
        "Suppressions of `ngrx-eventify/require-task-event` must include a reason after `--`.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (
            directivePattern.test(comment.value) &&
            !descriptionPattern.test(comment.value)
          ) {
            context.report({ node: comment, messageId });
          }
        }
      },
    };
  },
});
