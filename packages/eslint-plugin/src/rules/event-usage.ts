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

/** Recognizes a whole event group passed to a Task's on() builder. */
export function isGroupSubscription(
  node: ts.Node,
  checker: ts.TypeChecker,
  declaration: EventDeclaration,
): boolean {
  if (!ts.isIdentifier(node) && !ts.isPropertyAccessExpression(node))
    return false;
  const symbol = checker.getSymbolAtLocation(node);
  const parent = node.parent;
  return (
    !!symbol &&
    resolveAlias(symbol, checker) ===
      resolveAlias(declaration.groupSymbol, checker) &&
    ts.isCallExpression(parent) &&
    parent.arguments.slice(0, -1).includes(node as ts.Expression) &&
    ts.isIdentifier(parent.expression) &&
    parent.expression.text === "on" &&
    isWithinTask(parent)
  );
}

export function isPublication(node: ts.PropertyAccessExpression): boolean {
  let target: ts.Expression = node;
  while (true) {
    const wrapper = target.parent;
    if (
      ts.isParenthesizedExpression(wrapper) ||
      ts.isAsExpression(wrapper) ||
      ts.isTypeAssertionExpression(wrapper) ||
      ts.isNonNullExpression(wrapper) ||
      ts.isSatisfiesExpression(wrapper)
    ) {
      target = wrapper;
    } else if (
      ts.isConditionalExpression(wrapper) &&
      (wrapper.whenTrue === target || wrapper.whenFalse === target)
    ) {
      target = wrapper;
    } else {
      break;
    }
  }
  const parent = target.parent;
  if (
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === target &&
    parent.name.text === "publish" &&
    ts.isCallExpression(parent.parent) &&
    parent.parent.expression === parent
  ) {
    return true;
  }
  return (
    ts.isCallExpression(parent) &&
    parent.expression === target &&
    isWithinTask(parent)
  );
}

export function isSubscription(
  node: ts.PropertyAccessExpression,
  checker: ts.TypeChecker,
): boolean {
  const parent = node.parent;
  if (!ts.isCallExpression(parent) || !parent.arguments.includes(node)) {
    return false;
  }
  return (
    ts.isIdentifier(parent.expression) &&
    parent.expression.text === "on" &&
    (isWithinTask(parent) || isWithinStateSubscription(parent, checker))
  );
}

export function declarationNode(
  node: ts.Node,
  reverseNodeMap: { get(node: ts.Node): TSESTree.Node | undefined },
): TSESTree.Node | undefined {
  return reverseNodeMap.get(node);
}

function isWithinTask(node: ts.Node): boolean {
  let child: ts.Node = node;
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      current.arguments.some((argument) => argument === child) &&
      ((ts.isIdentifier(current.expression) &&
        current.expression.text === "task") ||
        (ts.isPropertyAccessExpression(current.expression) &&
          current.expression.name.text === "task"))
    ) {
      return true;
    }
    child = current;
    current = current.parent;
  }
  return false;
}

function isWithinStateSubscription(
  node: ts.Node,
  checker: ts.TypeChecker,
): boolean {
  let child: ts.Node = node;
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      current.arguments.some((argument) => argument === child) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === "state"
    ) {
      const receiver = checker.getTypeAtLocation(current.expression.expression);
      if (receiver.getProperty("reducer") && receiver.getProperty("views")) {
        return true;
      }
    }
    child = current;
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
