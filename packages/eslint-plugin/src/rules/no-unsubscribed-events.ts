import { ESLintUtils } from "@typescript-eslint/utils";
import * as ts from "typescript";
import {
  declarationNode,
  eventReference,
  findEventDeclarations,
  isSubscription,
} from "./event-usage";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
export const messageId = "unsubscribedEvent";

type MessageIds = typeof messageId;
type Options = readonly [];

/** Reports declared events that have no state or task subscriber. */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: { description: "Reports events that are never subscribed to." },
    schema: [],
    messages: {
      [messageId]: "Event `{{ event }}` has no subscriber and can be removed.",
    },
  },
  defaultOptions: [],
  create(context) {
    const services = context.sourceCode.parserServices;
    const program = services?.program;
    const nodeMap = services?.esTreeNodeToTSNodeMap;
    const reverseNodeMap = services?.tsNodeToESTreeNodeMap;
    if (!program || !nodeMap || !reverseNodeMap) return {};

    const checker = program.getTypeChecker();
    const sourceFile = nodeMap.get(context.sourceCode.ast);
    for (const declaration of findEventDeclarations(sourceFile, checker)) {
      const subscribed = findSubscribedEvents(program, checker, declaration);
      for (const event of declaration.events) {
        if (subscribed.has(event.name)) continue;
        const node = declarationNode(event.node, reverseNodeMap);
        if (node)
          context.report({ node, messageId, data: { event: event.name } });
      }
    }
    return {};
  },
});

function findSubscribedEvents(
  program: ts.Program,
  checker: ts.TypeChecker,
  declaration: ReturnType<typeof findEventDeclarations>[number],
): Set<string> {
  const subscribed = new Set<string>();
  for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile || program.isSourceFileFromExternalLibrary(file))
      continue;
    file.forEachChild(function visit(node): void {
      const event = eventReference(node, checker, declaration);
      if (
        event &&
        ts.isPropertyAccessExpression(node) &&
        isSubscription(node)
      ) {
        subscribed.add(event);
      }
      ts.forEachChild(node, visit);
    });
  }
  return subscribed;
}
