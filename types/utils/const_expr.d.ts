/**
 * Small static evaluator for module-scope constant expressions.
 *
 * Deliberately limited: it resolves expressions built from literals, other
 * module-scope constants, casts, and simple arithmetic, which is enough for
 * things like `@workgroup_size(N * 2)` or a loop bound of `COUNT`. It is not a
 * general const evaluator -- use WgslExec for that.
 */
import * as AST from "../wgsl_ast.js";
export declare function constExprValue(expr: AST.Expression | null, consts: Map<string, number>): number | null;
export declare function literalValue(expr: AST.LiteralExpr): number | null;
export declare function workgroupSizeOf(fn: AST.Function, consts: Map<string, number>): [number, number, number] | null;
