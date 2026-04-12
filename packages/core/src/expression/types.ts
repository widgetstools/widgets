// ─── Token Types ─────────────────────────────────────────────────────────────

export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'NULL'
  | 'IDENTIFIER'
  | 'COLUMN_REF'
  | 'OPERATOR'
  | 'COMPARISON'
  | 'LOGICAL'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'COMMA'
  | 'QUESTION'
  | 'COLON'
  | 'DOT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ─── AST Node Types ──────────────────────────────────────────────────────────

export type ExpressionNode =
  | LiteralNode
  | ColumnRefNode
  | VariableNode
  | BinaryNode
  | UnaryNode
  | TernaryNode
  | CallNode
  | MemberNode
  | ArrayNode;

export interface LiteralNode {
  type: 'literal';
  value: number | string | boolean | null;
}

export interface ColumnRefNode {
  type: 'columnRef';
  columnId: string;
}

export interface VariableNode {
  type: 'variable';
  name: string;
}

export interface BinaryNode {
  type: 'binary';
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryNode {
  type: 'unary';
  operator: string;
  operand: ExpressionNode;
}

export interface TernaryNode {
  type: 'ternary';
  condition: ExpressionNode;
  consequent: ExpressionNode;
  alternate: ExpressionNode;
}

export interface CallNode {
  type: 'call';
  name: string;
  args: ExpressionNode[];
}

export interface MemberNode {
  type: 'member';
  object: ExpressionNode;
  property: string;
}

export interface ArrayNode {
  type: 'array';
  elements: ExpressionNode[];
}

// ─── Evaluation Context ──────────────────────────────────────────────────────

export interface EvaluationContext {
  x: unknown;
  value: unknown;
  data: Record<string, unknown>;
  columns: Record<string, unknown>;
  oldValue?: unknown;
  newValue?: unknown;
}

// ─── Function Registry ───────────────────────────────────────────────────────

export interface FunctionDefinition {
  name: string;
  category: string;
  description: string;
  signature: string;
  minArgs: number;
  maxArgs: number;
  evaluate: (args: unknown[], ctx: EvaluationContext) => unknown;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationError {
  message: string;
  position: number;
  length: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
