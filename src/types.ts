/**
 * Vue component hierarchy node types.
 */

/** Supported Options API categories */
export type HierarchyCategory =
  | "props"
  | "data"
  | "computed"
  | "methods"
  | "watch"
  | "lifecycle"
  | "components"
  | "directives"
  | "mixins"
  | "provide"
  | "inject"
  | "emits"
  | "filters"
  | "template"
  | "style";

/** Lifecycle hook names */
export const LIFECYCLE_HOOKS = [
  "beforeCreate",
  "created",
  "beforeMount",
  "mounted",
  "beforeUpdate",
  "updated",
  "beforeDestroy",
  "destroyed",
  "activated",
  "deactivated",
  "errorCaptured",
  "serverPrefetch",
  // Vue 3 aliases
  "beforeUnmount",
  "unmounted",
] as const;

/** A single item in the hierarchy tree */
export interface HierarchyNode {
  /** Display label (e.g. property name) */
  label: string;
  /** Category this node belongs to */
  category: HierarchyCategory;
  /** Line number in the source file (0-based) */
  line: number;
  /** Column number in the source file (0-based) */
  column: number;
  /** Optional type annotation or short description */
  detail?: string;
  /** Child nodes (e.g. individual props under the "props" category) */
  children?: HierarchyNode[];
  /** Icon identifier for the tree item */
  icon?: string;
}

/** Result of parsing a Vue file */
export interface ParseResult {
  /** Top-level category nodes */
  categories: HierarchyNode[];
  /** File path that was parsed */
  filePath: string;
  /** Timestamp of the parse */
  timestamp: number;
  /** Any non-fatal issues encountered during parsing */
  warnings?: string[];
}
