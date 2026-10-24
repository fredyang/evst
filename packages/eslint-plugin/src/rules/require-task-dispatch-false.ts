import { ESLintUtils } from "@typescript-eslint/utils";
import * as ts from "typescript";

export default ESLintUtils.RuleCreator.withoutDocs<
  readonly [],
  "nonEventOutput" | "cyclicEventOutput"
>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Requires dispatch: false for Tasks emitting non-event values or subscribed events.",
    },
    schema: [],
    messages: {
      cyclicEventOutput:
        "This task can re-emit a subscribed event and trigger itself repeatedly. Return a different outcome event or set { dispatch: false }.",
      nonEventOutput:
        "This task emits a non-event value. Return events or set { dispatch: false } to prevent NgRx from dispatching its output.",
    },
  },
  defaultOptions: [],
  create(context) {
    const services = context.sourceCode.parserServices;
    const checker = services?.program?.getTypeChecker();
    const nodeMap = services?.esTreeNodeToTSNodeMap;
    if (!checker || !nodeMap) return {};

    return {
      CallExpression(node) {
        const call = nodeMap.get(node);
        if (!ts.isCallExpression(call) || !isTaskBuilder(call, checker)) return;
        const args = call.arguments;
        const last = args.at(-1);
        if (!last) return;
        const lastType = checker.getTypeAtLocation(last);
        const hasOptions =
          checker.getSignaturesOfType(lastType, ts.SignatureKind.Call)
            .length === 0;
        if (hasOptions) {
          const dispatch = checker.getPropertyOfType(lastType, "dispatch");
          if (dispatch) {
            const type = checker.getTypeOfSymbolAtLocation(dispatch, last);
            if (
              type.flags & ts.TypeFlags.BooleanLiteral &&
              checker.typeToString(type) === "false"
            )
              return;
          }
        }
        const source = args.at(hasOptions ? -2 : -1);
        if (!source) return;
        const signatures = checker.getSignaturesOfType(
          checker.getTypeAtLocation(source),
          ts.SignatureKind.Call,
        );
        const subscribedTypes = new Set<string>();
        for (const input of args.slice(0, hasOptions ? -2 : -1)) {
          collectInputTypes(
            checker.getTypeAtLocation(input),
            input,
            checker,
            subscribedTypes,
          );
        }
        for (const signature of signatures) {
          const outputs = observableOutputs(
            checker.getReturnTypeOfSignature(signature),
            checker,
          );
          if (
            outputs.some((output) => invalidOutput(output, source, checker))
          ) {
            context.report({ node, messageId: "nonEventOutput" });
            return;
          }
          if (
            outputs.some((output) =>
              eventTypes(output, source, checker).some((type) =>
                subscribedTypes.has(type),
              ),
            )
          ) {
            context.report({ node, messageId: "cyclicEventOutput" });
            return;
          }
        }
      },
    };
  },
});

function isTaskBuilder(
  call: ts.CallExpression,
  checker: ts.TypeChecker,
): boolean {
  const symbol = checker.getSymbolAtLocation(call.expression);
  return !!symbol?.declarations?.some((declaration) => {
    if (!ts.isParameter(declaration)) return false;
    const callback = declaration.parent;
    if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))
      return false;
    if (callback.parameters[0] !== declaration) return false;
    const parent = callback.parent;
    if (!ts.isCallExpression(parent)) return false;
    const callee = parent.expression;
    return (
      (ts.isIdentifier(callee) && callee.text === "task") ||
      (ts.isPropertyAccessExpression(callee) && callee.name.text === "task")
    );
  });
}

function observableOutputs(type: ts.Type, checker: ts.TypeChecker): ts.Type[] {
  if (type.isUnion()) {
    return type.types.flatMap((part) => observableOutputs(part, checker));
  }
  const subscribe = checker.getPropertyOfType(type, "subscribe");
  const declaration =
    subscribe?.valueDeclaration ?? subscribe?.declarations?.[0];
  if (!subscribe || !declaration) return [];
  const subscribeType = checker.getTypeOfSymbolAtLocation(
    subscribe,
    declaration,
  );
  for (const signature of checker.getSignaturesOfType(
    subscribeType,
    ts.SignatureKind.Call,
  )) {
    const observer = signature.parameters[0];
    if (!observer) continue;
    const observerType = checker.getTypeOfSymbolAtLocation(
      observer,
      declaration,
    );
    for (const candidate of observerType.isUnion()
      ? observerType.types
      : [observerType]) {
      for (const callback of checker.getSignaturesOfType(
        candidate,
        ts.SignatureKind.Call,
      )) {
        const value = callback.parameters[0];
        if (value)
          return [checker.getTypeOfSymbolAtLocation(value, declaration)];
      }
    }
  }
  return [];
}

function invalidOutput(
  type: ts.Type,
  location: ts.Node | undefined,
  checker: ts.TypeChecker,
): boolean {
  if (type.isUnion())
    return type.types.some((part) => invalidOutput(part, location, checker));
  if (
    type.flags &
    (ts.TypeFlags.Any |
      ts.TypeFlags.Unknown |
      ts.TypeFlags.Never |
      ts.TypeFlags.TypeParameter)
  )
    return false;
  if (checker.getSignaturesOfType(type, ts.SignatureKind.Call).length)
    return true;
  const property = checker.getPropertyOfType(type, "type");
  if (!property || property.flags & ts.SymbolFlags.Optional) return true;
  const propertyType = checker.getTypeOfSymbolAtLocation(
    property,
    location ?? property.valueDeclaration ?? property.declarations![0],
  );
  if (
    propertyType.flags &
    (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)
  )
    return false;
  return !checker.isTypeAssignableTo(propertyType, checker.getStringType());
}

/** Only literal event names establish a known cycle; broad strings are inconclusive. */
function eventTypes(
  type: ts.Type,
  location: ts.Node,
  checker: ts.TypeChecker,
): string[] {
  if (type.isUnion())
    return type.types.flatMap((part) => eventTypes(part, location, checker));
  if (
    type.flags &
    (ts.TypeFlags.Any |
      ts.TypeFlags.Unknown |
      ts.TypeFlags.Never |
      ts.TypeFlags.TypeParameter)
  )
    return [];
  const property = checker.getPropertyOfType(type, "type");
  if (!property || property.flags & ts.SymbolFlags.Optional) return [];
  const name = checker.getTypeOfSymbolAtLocation(property, location);
  return (name.isUnion() ? name.types : [name]).flatMap((part) =>
    part.isStringLiteral() ? [part.value] : [],
  );
}

function collectInputTypes(
  type: ts.Type,
  location: ts.Node,
  checker: ts.TypeChecker,
  names: Set<string>,
): void {
  if (checker.getSignaturesOfType(type, ts.SignatureKind.Call).length) {
    for (const name of eventTypes(type, location, checker)) names.add(name);
    return;
  }
  // Event groups contain event creators; their group label is not an event type.
  for (const property of checker.getPropertiesOfType(type)) {
    const creator = checker.getTypeOfSymbolAtLocation(property, location);
    if (checker.getSignaturesOfType(creator, ts.SignatureKind.Call).length) {
      for (const name of eventTypes(creator, location, checker))
        names.add(name);
    }
  }
}
