import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import * as ts from "typescript";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
const messageId = "multiplePublishers";

export default createRule<readonly [], typeof messageId>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Ensures an event has one publishing call site in a project.",
    },
    schema: [],
    messages: {
      [messageId]:
        "Event `{{ event }}` has multiple publishers:\n{{ publishers }}\nPublish it from one boundary, or model the shared operation as a service command.",
    },
  },
  defaultOptions: [],
  create(context) {
    const services = context.sourceCode.parserServices;
    const program = services?.program;
    const nodeMap = services?.esTreeNodeToTSNodeMap;
    const checker = program?.getTypeChecker();
    const localCalls: { node: TSESTree.CallExpression; event: string }[] = [];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== "MemberExpression" ||
          node.callee.computed ||
          node.callee.property.type !== "Identifier" ||
          node.callee.property.name !== "publish"
        )
          return;
        const event = memberName(node.callee.object);
        if (event) localCalls.push({ node, event });
      },
      "Program:exit"() {
        if (!localCalls.length) return;
        // Rebuild from this program snapshot, not lint order or a global map.
        const publishers = new Map<ts.Symbol | string, string[]>();
        if (program && checker && nodeMap) {
          for (const file of program.getSourceFiles()) {
            if (
              file.isDeclarationFile ||
              program.isSourceFileFromExternalLibrary(file)
            )
              continue;
            file.forEachChild(function visit(node): void {
              const symbol = publisherSymbol(node, checker);
              if (symbol) {
                const { line, character } = file.getLineAndCharacterOfPosition(
                  node.getStart(file),
                );
                add(symbol, location(file.fileName, line + 1, character + 1));
              }
              ts.forEachChild(node, visit);
            });
          }
        } else {
          // Without a TypeScript project, only this file can be checked reliably.
          for (const { node, event } of localCalls) {
            add(
              event,
              location(
                context.getPhysicalFilename(),
                node.loc.start.line,
                node.loc.start.column + 1,
              ),
            );
          }
        }
        for (const { node, event } of localCalls) {
          const key =
            checker && nodeMap
              ? publisherSymbol(nodeMap.get(node), checker)
              : event;
          const locations = key && publishers.get(key);
          if (!locations || locations.length < 2) continue;
          context.report({
            node,
            messageId,
            data: { event, publishers: [...locations].sort().join("\n") },
          });
        }
        function add(key: ts.Symbol | string, location: string): void {
          const locations = publishers.get(key) ?? [];
          locations.push(location);
          publishers.set(key, locations);
        }
      },
    };
    function location(filename: string, line: number, column: number): string {
      const normalized = filename.replaceAll("\\", "/");
      const cwd = context.getCwd().replaceAll("\\", "/").replace(/\/$/, "");
      const relative = normalized.startsWith(`${cwd}/`)
        ? normalized.slice(cwd.length + 1)
        : normalized;
      return `${relative}:${line}:${column}`;
    }
  },
});

function publisherSymbol(
  node: ts.Node,
  checker: ts.TypeChecker,
): ts.Symbol | undefined {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== "publish"
  )
    return undefined;
  const symbol = checker.getSymbolAtLocation(node.expression.expression);
  return (
    symbol &&
    (symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol)
  );
}

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
