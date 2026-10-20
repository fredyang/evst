import { ESLintUtils } from "@typescript-eslint/utils";
import * as ts from "typescript";

export default ESLintUtils.RuleCreator.withoutDocs<
  readonly [],
  "nonEventOutput"
>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Requires dispatch: false for Tasks emitting non-event values.",
    },
    schema: [],
    messages: {
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
        for (const signature of signatures) {
          const output = observableOutput(
            checker.getReturnTypeOfSignature(signature),
            checker,
          );
          if (output && invalidOutput(output, source, checker)) {
            context.report({ node, messageId: "nonEventOutput" });
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

function observableOutput(
  type: ts.Type,
  checker: ts.TypeChecker,
): ts.Type | undefined {
  if (type.isUnion()) {
    // Each possible observable return type is checked by invalidOutput below.
    const outputs = type.types.map((part) => observableOutput(part, checker));
    return outputs.find(
      (output) => output && invalidOutput(output, undefined, checker),
    );
  }
  const subscribe = checker.getPropertyOfType(type, "subscribe");
  const declaration =
    subscribe?.valueDeclaration ?? subscribe?.declarations?.[0];
  if (!subscribe || !declaration) return;
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
        if (value) return checker.getTypeOfSymbolAtLocation(value, declaration);
      }
    }
  }
  return;
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
