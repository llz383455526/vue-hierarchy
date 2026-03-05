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
  | "style"
  | "state"
  | "composables"
  | "expose"
  | "slots"
  | "interface";

/** Lifecycle hook names (Options API) */
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

/** Composition API lifecycle hook function names */
export const COMPOSITION_LIFECYCLE_HOOKS = [
  "onBeforeMount",
  "onMounted",
  "onBeforeUpdate",
  "onUpdated",
  "onBeforeUnmount",
  "onUnmounted",
  "onActivated",
  "onDeactivated",
  "onErrorCaptured",
  "onRenderTracked",
  "onRenderTriggered",
  "onServerPrefetch",
] as const;

/** Reactive state factory function names */
export const REACTIVE_STATE_FUNCTIONS = [
  "ref",
  "reactive",
  "shallowRef",
  "shallowReactive",
  "toRef",
  "toRefs",
  "readonly",
  "shallowReadonly",
] as const;

/** Watch function names */
export const WATCH_FUNCTIONS = [
  "watch",
  "watchEffect",
  "watchPostEffect",
  "watchSyncEffect",
] as const;

/** Define macros (compiler macros in <script setup>) */
export const DEFINE_MACROS = [
  "defineProps",
  "defineEmits",
  "defineExpose",
  "defineSlots",
  "defineOptions",
  "defineModel",
  "withDefaults",
] as const;

/** A reference to an identifier found in the template */
export interface TemplateRef {
  /** Line number in the source file (0-based) */
  line: number;
  /** Reference type, e.g. "{{ }}", ":title", "v-if", "v-for", "v-model", "v-show" */
  type: string;
  /** Short context description, e.g. the attribute name or directive */
  context: string;
}

/** An event binding from the template to a method */
export interface EventBinding {
  /** Event name, e.g. "click", "submit" */
  event: string;
  /** Line number in the source file (0-based) */
  line: number;
}

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
  /** Number of times this identifier is referenced in the template */
  refCount?: number;
  /** Detailed reference locations in the template */
  refs?: TemplateRef[];
  /** Template event bindings that trigger this method */
  eventBindings?: EventBinding[];
  /** Names of other methods this method calls */
  calls?: string[];
  /** Names of methods that call this method */
  calledBy?: string[];
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
