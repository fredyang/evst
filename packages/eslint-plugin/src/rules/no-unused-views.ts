import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import * as ts from "typescript";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
export const messageId = "unusedView";

type MessageIds = typeof messageId;
type Options = readonly [];

/**
 * Reports statically unused properties declared through `evst().view()`.
 *
 * The check uses the TypeScript program, rather than import text, so renamed
 * imports and barrel re-exports still resolve to the original view declaration.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description: "Reports statically unused EVST state views.",
    },
    schema: [],
    messages: {
      [messageId]: "View `{{ view }}` is not referenced and can be removed.",
    },
  },
  defaultOptions: [],
  create(context) {
    const services = context.sourceCode.parserServices;
    const program = services?.program;
    const nodeMap = services?.esTreeNodeToTSNodeMap;
    const reverseNodeMap = services?.tsNodeToESTreeNodeMap;

    // Type-aware linting is optional for consumers that do not configure a project.
    if (!program || !nodeMap || !reverseNodeMap) return {};

    const checker = program.getTypeChecker();
    const sourceFile = nodeMap.get(context.sourceCode.ast);
    const declarations = findViewDeclarations(sourceFile, checker);

    const used = findUsages(program, checker);
    for (const declaration of declarations) {
      if (used.has(declaration.node)) continue;
      const node = reverseNodeMap.get(declaration.node) as
        TSESTree.Node | undefined;
      if (node)
        context.report({ node, messageId, data: { view: declaration.name } });
    }

    return {};
  },
});

interface ViewDeclaration {
  name: string;
  node: ts.PropertyName;
}

function findViewDeclarations(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): ViewDeclaration[] {
  const declarations: ViewDeclaration[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "view"
    ) {
      const receiver = checker.getTypeAtLocation(node.expression.expression);
      const callback = node.arguments[0];
      if (
        receiver.getProperty("reducer") &&
        receiver.getProperty("views") &&
        callback &&
        (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
      ) {
        const object = returnedObject(callback);
        if (object)
          for (const property of object.properties) {
            if (
              !ts.isPropertyAssignment(property) &&
              !ts.isShorthandPropertyAssignment(property)
            )
              continue;
            const name = propertyName(property.name);
            if (name) declarations.push({ name, node: property.name });
          }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return declarations;
}

function returnedObject(
  callback: ts.ArrowFunction | ts.FunctionExpression,
): ts.ObjectLiteralExpression | undefined {
  const body = ts.isParenthesizedExpression(callback.body)
    ? callback.body.expression
    : callback.body;
  if (ts.isObjectLiteralExpression(body)) return body;
  if (!ts.isBlock(body)) return undefined;
  const statement = body.statements.find(ts.isReturnStatement);
  return statement?.expression &&
    ts.isObjectLiteralExpression(statement.expression)
    ? statement.expression
    : undefined;
}

function propertyName(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
    ? name.text
    : undefined;
}

/** Tracks declaration identities through mapped types, intersections, aliases and imports. */
function findUsages(
  program: ts.Program,
  checker: ts.TypeChecker,
): Set<ts.Node> {
  const used = new Set<ts.Node>();
  function mark(symbol: ts.Symbol | undefined): void {
    if (!symbol) return;
    for (const root of checker.getRootSymbols(symbol)) {
      for (const declaration of root.declarations ?? []) {
        if (
          ts.isPropertyAssignment(declaration) ||
          ts.isShorthandPropertyAssignment(declaration)
        )
          used.add(declaration.name);
      }
    }
  }
  function markProperty(expression: ts.Expression, name: string): void {
    mark(
      checker.getPropertyOfType(checker.getTypeAtLocation(expression), name),
    );
  }
  for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile) continue;
    function visit(node: ts.Node): void {
      if (ts.isPropertyAccessExpression(node))
        markProperty(node.expression, node.name.text);
      if (ts.isElementAccessExpression(node)) {
        if (ts.isStringLiteral(node.argumentExpression))
          markProperty(node.expression, node.argumentExpression.text);
        else
          for (const property of checker
            .getTypeAtLocation(node.expression)
            .getProperties())
            mark(property);
      }
      if (ts.isObjectBindingPattern(node)) {
        const type = checker.getTypeAtLocation(node);
        for (const element of node.elements) {
          if (element.dotDotDotToken) {
            for (const property of type.getProperties()) mark(property);
          } else {
            const name = propertyName(
              element.propertyName ?? (element.name as ts.PropertyName),
            );
            if (name) mark(checker.getPropertyOfType(type, name));
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  return used;
}
