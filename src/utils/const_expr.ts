/**
 * Small static evaluator for module-scope constant expressions.
 *
 * Deliberately limited: it resolves expressions built from literals, other
 * module-scope constants, casts, and simple arithmetic, which is enough for
 * things like `@workgroup_size(N * 2)` or a loop bound of `COUNT`. It is not a
 * general const evaluator -- use WgslExec for that.
 */

import * as AST from "../wgsl_ast.js";

/// Evaluate an expression to a number, if it's built only from literals and
/// the given module-scope constants. Returns null if it can't be resolved.
export function constExprValue(
  expr: AST.Expression | null,
  consts: Map<string, number>
): number | null {
  if (!expr) {
    return null;
  }
  if (expr instanceof AST.LiteralExpr) {
    return literalValue(expr);
  }
  if (expr instanceof AST.ConstExpr) {
    return constExprValue(expr.initializer, consts);
  }
  if (expr instanceof AST.VariableExpr) {
    if (expr.postfix) {
      return null;
    }
    return consts.get(expr.name) ?? null;
  }
  if (expr instanceof AST.CreateExpr) {
    // `i32(4)` / `u32(N)` -- a cast around a constant.
    const args = expr.args ?? [];
    return args.length === 1 ? constExprValue(args[0], consts) : null;
  }
  if (expr instanceof AST.UnaryOperator) {
    const v = constExprValue(expr.right, consts);
    if (v === null) {
      return null;
    }
    return expr.operator === "-" ? -v : expr.operator === "+" ? v : null;
  }
  if (expr instanceof AST.BinaryOperator) {
    const a = constExprValue(expr.left, consts);
    const b = constExprValue(expr.right, consts);
    if (a === null || b === null) {
      return null;
    }
    switch (expr.operator) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? null : a / b;
      case "%": return b === 0 ? null : a % b;
      case "<<": return a << b;
      case ">>": return a >> b;
      default: return null;
    }
  }
  return null;
}

/// The numeric value of a literal expression, or null if it isn't a scalar.
export function literalValue(expr: AST.LiteralExpr): number | null {
  const data = expr.value as unknown as { data?: ArrayLike<number>; value?: number };
  if (data?.data && data.data.length > 0) {
    return Number(data.data[0]);
  }
  if (typeof data?.value === "number") {
    return data.value;
  }
  return null;
}

/// The [x, y, z] of the function's @workgroup_size attribute, or null if it
/// doesn't have one. Omitted dimensions are 1, as are dimensions given by an
/// identifier that isn't in `consts`, such as an override with no default
/// value, whose size is only known at pipeline creation.
export function workgroupSizeOf(
  fn: AST.Function,
  consts: Map<string, number>
): [number, number, number] | null {
  for (const attr of fn.attributes ?? []) {
    if (attr.name !== "workgroup_size") {
      continue;
    }
    // The attribute value is unparsed token text: a single string for
    // @workgroup_size(8), an array of strings for @workgroup_size(8, 4).
    const value = attr.value;
    if (value === null) {
      return [1, 1, 1];
    }
    const parts = Array.isArray(value) ? value : [value];
    const dims: number[] = [1, 1, 1];
    for (let i = 0; i < 3 && i < parts.length; ++i) {
      const raw = parts[i];
      const n = Number(raw);
      dims[i] = Number.isFinite(n) ? n : (consts.get(String(raw)) ?? 1);
    }
    return [dims[0], dims[1], dims[2]];
  }
  return null;
}
