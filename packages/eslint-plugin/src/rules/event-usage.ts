import type { TSESTree } from "@typescript-eslint/utils";
import * as ts from "typescript";

export interface EventDeclaration {
  groupSymbol: ts.Symbol;
  events: readonly { name: string; node: ts.PropertyName }[];
}

export function findEventDeclarations(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): EventDeclaration[] {
  const declarations: EventDeclaration[] = [];

  sourceFile.forEachChild(function visit(node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "events"
    ) {
      const definitions = node.initializer.arguments[1];
      const groupSymbol = checker.getSymbolAtLocation(node.name);
      if (
        groupSymbol &&
        definitions &&
        ts.isObjectLiteralExpression(definitions)
      ) {
        const events = definitions.properties.flatMap((property) => {
          if (!ts.isPropertyAssignment(property)) return [];
          const name = propertyName(property.name);
          return name ? [{ name, node: property.name }] : [];
        });
        if (events.length) declarations.push({ groupSymbol, events });
      }
    }
    ts.forEachChild(node, visit);
  });

  return declarations;
}

export function eventReference(
  node: ts.Node,
  checker: ts.TypeChecker,
  declaration: EventDeclaration,
): string | undefined {
  if (!ts.isPropertyAccessExpression(node)) return undefined;
  const group = checker.getSymbolAtLocation(node.expression);
  if (
    !group ||
    resolveAlias(group, checker) !==
      resolveAlias(declaration.groupSymbol, checker)
  ) {
    return undefined;
  }
  return declaration.events.some((event) => event.name === node.name.text)
    ? node.name.text
    : undefined;
}

export function isPublication(node: ts.PropertyAccessExpression): boolean {
  const parent = node.parent;
  if (
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === node &&
    parent.name.text === "publish" &&
    ts.isCallExpression(parent.parent) &&
    parent.parent.expression === parent
  ) {
    return true;
  }
  return (
    ts.isCallExpression(parent) &&
    parent.expression === node &&
    isWithinTask(parent)
  );
}

export function isSubscription(node: ts.PropertyAccessExpression): boolean {
  const parent = node.parent;
  if (!ts.isCallExpression(parent) || !parent.arguments.includes(node)) {
    return false;
  }
  if (
    ts.isPropertyAccessExpression(parent.expression) &&
    parent.expression.name.text === "on"
  ) {
    return true;
  }
  return (
    ts.isIdentifier(parent.expression) &&
    parent.expression.text === "on" &&
    (isWithinTask(parent) || isWithinStateHandle(parent))
  );
}

export function declarationNode(
  node: ts.Node,
  reverseNodeMap: { get(node: ts.Node): TSESTree.Node | undefined },
): TSESTree.Node | undefined {
  return reverseNodeMap.get(node);
}

function isWithinTask(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      ((ts.isIdentifier(current.expression) &&
        current.expression.text === "tasks") ||
        (ts.isPropertyAccessExpression(current.expression) &&
          ts.isIdentifier(current.expression.expression) &&
          current.expression.expression.text === "task" &&
          current.expression.name.text === "handle"))
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isWithinStateHandle(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === "handle"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function propertyName(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name)
    ? name.text
    : undefined;
}

function resolveAlias(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}
