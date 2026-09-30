import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import * as ts from "typescript";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
export const messageId = "unusedView";

type MessageIds = typeof messageId;
type Options = readonly [];

/**
 * Reports statically unused properties declared through `state().withViews()`.
 *
 * The check uses the TypeScript program, rather than import text, so renamed
 * imports and barrel re-exports still resolve to the original `*.views` export.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description: "Reports statically unused NgRx Eventify state views.",
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

    for (const declaration of declarations) {
      const usage = findUsages(program, checker, declaration.viewsSymbol);
      if (usage.dynamic) continue;

      for (const view of declaration.views) {
        if (!usage.names.has(view.name)) {
          const node = reverseNodeMap.get(view.node) as
            TSESTree.Node | undefined;
          if (node) {
            context.report({ node, messageId, data: { view: view.name } });
          }
        }
      }
    }

    return {};
  },
});

interface ViewDeclaration {
  viewsSymbol: ts.Symbol;
  views: readonly { name: string; node: ts.PropertyName }[];
}

function findViewDeclarations(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): ViewDeclaration[] {
  const variables = new Map<string, ts.VariableDeclaration>();
  const declarations: ViewDeclaration[] = [];

  sourceFile.forEachChild(function visit(node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      variables.set(node.name.text, node);
    }
    ts.forEachChild(node, visit);
  });

  for (const variable of variables.values()) {
    if (
      !variable.initializer ||
      !ts.isPropertyAccessExpression(variable.initializer) ||
      variable.initializer.name.text !== "views" ||
      !ts.isIdentifier(variable.initializer.expression)
    ) {
      continue;
    }

    const state = variables.get(variable.initializer.expression.text);
    const callback =
      state?.initializer && findWithViewsCallback(state.initializer);
    const object = callback && returnedObject(callback);
    const viewsSymbol = checker.getSymbolAtLocation(variable.name);
    if (!object || !viewsSymbol) continue;

    const views = object.properties.flatMap((property) => {
      if (!ts.isPropertyAssignment(property) || !property.name) return [];
      const name = propertyName(property.name);
      return name ? [{ name, node: property.name }] : [];
    });
    if (views.length) declarations.push({ viewsSymbol, views });
  }

  return declarations;
}

function findWithViewsCallback(node: ts.Node): ts.ArrowFunction | undefined {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "withViews" &&
    ts.isArrowFunction(node.arguments[0])
  ) {
    return node.arguments[0];
  }
  return ts.forEachChild(node, findWithViewsCallback);
}

function returnedObject(
  callback: ts.ArrowFunction,
): ts.ObjectLiteralExpression | undefined {
  const body = ts.isParenthesizedExpression(callback.body)
    ? callback.body.expression
    : callback.body;
  if (ts.isObjectLiteralExpression(body)) return body;
  if (!ts.isBlock(callback.body)) return undefined;
  const statement = callback.body.statements.find(ts.isReturnStatement);
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

function findUsages(
  program: ts.Program,
  checker: ts.TypeChecker,
  viewsSymbol: ts.Symbol,
): { names: Set<string>; dynamic: boolean } {
  const names = new Set<string>();
  let dynamic = false;

  for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile) continue;
    file.forEachChild(function visit(node): void {
      if (
        ts.isPropertyAccessExpression(node) &&
        isViewsReference(node.expression, checker, viewsSymbol)
      ) {
        names.add(node.name.text);
      }
      if (
        ts.isElementAccessExpression(node) &&
        isViewsReference(node.expression, checker, viewsSymbol)
      ) {
        dynamic = true;
      }
      ts.forEachChild(node, visit);
    });
  }
  return { names, dynamic };
}

function isViewsReference(
  node: ts.Expression,
  checker: ts.TypeChecker,
  viewsSymbol: ts.Symbol,
): boolean {
  const symbol = checker.getSymbolAtLocation(node);
  if (!symbol) return false;
  return resolveAlias(symbol, checker) === resolveAlias(viewsSymbol, checker);
}

function resolveAlias(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}
