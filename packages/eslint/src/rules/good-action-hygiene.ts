import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator.withoutDocs;
const actionCreator = `CallExpression[callee.name='createAction']`;

export const messageId = 'goodActionHygiene';

type MessageIds = typeof messageId;
type Options = readonly [];

export default createRule<Options, MessageIds>({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensures the use of good action hygiene.',
    },
    schema: [],
    messages: {
      [messageId]:
        'Action type `{{ actionType }}` must include a nonempty "[Source]" and an event ending in a past-tense verb (for example "[Collection Page] Entered"), or a subject followed by "Success" or "Failure".',
    },
  },
  defaultOptions: [],
  create: (context) => {
    const sourceEventPattern = /^\[[^\]\r\n[]*\S[^\]\r\n[]*\] +([^\r\n]+)$/;
    const pastTensePattern =
      /^(?:[a-z]+ed|begun|bound|bought|broken|built|caught|chosen|done|drawn|driven|felt|found|forgotten|given|gone|grown|held|hidden|kept|known|left|lost|made|met|paid|put|read|reset|run|seen|sent|set|shown|sold|spent|split|taken|taught|told|thrown|undone|understood|won|written)$/i;

    function checkActionType(node: TSESTree.Node, actionType: string) {
      const event = sourceEventPattern.exec(actionType)?.[1];
      const words = event?.trim().split(/\s+/);

      if (
        words &&
        (pastTensePattern.test(words[words.length - 1]) ||
          (words.length >= 2 &&
            /^(?:success|failure)$/i.test(words[words.length - 1])))
      ) {
        return;
      }

      context.report({ node, messageId, data: { actionType } });
    }

    return {
      [`${actionCreator}[arguments.0.type='Literal']`]({
        arguments: [node],
      }: Omit<TSESTree.CallExpression, 'arguments'> & {
        arguments: TSESTree.StringLiteral[];
      }) {
        const { value: actionType } = node;

        if (typeof actionType !== 'string') {
          return;
        }

        checkActionType(node, actionType);
      },
      "CallExpression[callee.name='events']"(
        node: TSESTree.CallExpression
      ) {
        const [source, events] = node.arguments;
        if (
          source?.type !== 'Literal' ||
          typeof source.value !== 'string' ||
          events?.type !== 'ObjectExpression'
        ) {
          return;
        }

        for (const property of events.properties) {
          if (property.type !== 'Property' || property.computed) {
            continue;
          }
          const key = property.key;
          const eventKey =
            key.type === 'Identifier'
              ? key.name
              : key.type === 'Literal' && typeof key.value === 'string'
                ? key.value
                : undefined;
          if (eventKey === undefined) {
            continue;
          }
          const eventLabel = eventKey
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/^./, (letter) => letter.toUpperCase());
          checkActionType(key, `[${source.value}] ${eventLabel}`);
        }
      },
    };
  },
});
