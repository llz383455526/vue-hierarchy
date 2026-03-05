import { parse as parseSFC } from "@vue/compiler-sfc";
import { parse as babelParse } from "@babel/parser";
import type {
  ObjectExpression,
  ObjectMethod,
  ObjectProperty,
  SpreadElement,
  Node,
  CallExpression,
  Statement,
  VariableDeclaration,
  ExpressionStatement,
  TSTypeAnnotation,
  TSTypeReference,
  TSTypeLiteral,
  Identifier,
} from "@babel/types";
import {
  HierarchyNode,
  HierarchyCategory,
  ParseResult,
  TemplateRef,
  EventBinding,
  LIFECYCLE_HOOKS,
  COMPOSITION_LIFECYCLE_HOOKS,
  REACTIVE_STATE_FUNCTIONS,
  WATCH_FUNCTIONS,
  DEFINE_MACROS,
} from "./types";

/** Category icon mapping */
const CATEGORY_ICONS: Record<string, string> = {
  props: "symbol-parameter",
  data: "symbol-field",
  computed: "symbol-property",
  methods: "symbol-method",
  watch: "eye",
  lifecycle: "clock",
  components: "extensions",
  directives: "symbol-keyword",
  mixins: "git-merge",
  provide: "arrow-up",
  inject: "arrow-down",
  emits: "megaphone",
  filters: "filter",
  template: "file-code",
  style: "paintcan",
  state: "symbol-variable",
  composables: "symbol-misc",
  expose: "symbol-interface",
  slots: "symbol-snippet",
  interface: "plug",
};

/** Member icon mapping */
const MEMBER_ICONS: Record<string, string> = {
  props: "symbol-parameter",
  data: "symbol-variable",
  computed: "symbol-property",
  methods: "symbol-method",
  watch: "eye",
  lifecycle: "symbol-event",
  components: "symbol-class",
  directives: "symbol-keyword",
  mixins: "symbol-interface",
  provide: "symbol-constant",
  inject: "symbol-constant",
  emits: "symbol-event",
  filters: "symbol-operator",
  state: "symbol-variable",
  composables: "symbol-misc",
  expose: "symbol-interface",
  slots: "symbol-snippet",
};

/**
 * Maps option key names to their HierarchyCategory.
 */
function keyToCategory(key: string): HierarchyCategory | null {
  const directMap: Record<string, HierarchyCategory> = {
    props: "props",
    data: "data",
    computed: "computed",
    methods: "methods",
    watch: "watch",
    components: "components",
    directives: "directives",
    mixins: "mixins",
    provide: "provide",
    inject: "inject",
    emits: "emits",
    filters: "filters",
  };
  if (directMap[key]) {
    return directMap[key];
  }
  if ((LIFECYCLE_HOOKS as readonly string[]).includes(key)) {
    return "lifecycle";
  }
  return null;
}

/**
 * Safely get a property key name from an AST node.
 */
function getKeyName(
  prop: ObjectProperty | ObjectMethod | SpreadElement,
): string | null {
  if (prop.type === "SpreadElement") {
    return null;
  }
  const key = prop.key;
  if (key.type === "Identifier") {
    return key.name;
  }
  if (key.type === "StringLiteral") {
    return key.value;
  }
  return null;
}

/**
 * Get the start location of a node, accounting for the script block offset.
 */
function getLoc(
  node: Node,
  scriptStartLine: number,
): { line: number; column: number } {
  const loc = node.loc;
  if (loc) {
    return {
      line: loc.start.line - 1 + scriptStartLine, // 0-based
      column: loc.start.column,
    };
  }
  return { line: 0, column: 0 };
}

/**
 * Extract child members from an ObjectExpression (e.g. the `methods: { ... }` value).
 */
function extractObjectMembers(
  obj: ObjectExpression,
  category: HierarchyCategory,
  scriptStartLine: number,
): HierarchyNode[] {
  const children: HierarchyNode[] = [];
  for (const prop of obj.properties) {
    const name = getKeyName(
      prop as ObjectProperty | ObjectMethod | SpreadElement,
    );
    if (!name) {
      continue;
    }
    const loc = getLoc(prop, scriptStartLine);
    let detail: string | undefined;

    // For computed properties with get/set
    if (
      category === "computed" &&
      prop.type === "ObjectProperty" &&
      prop.value.type === "ObjectExpression"
    ) {
      const hasGet = prop.value.properties.some(
        (p) =>
          (p.type === "ObjectProperty" || p.type === "ObjectMethod") &&
          getKeyName(p as ObjectProperty | ObjectMethod | SpreadElement) ===
            "get",
      );
      const hasSet = prop.value.properties.some(
        (p) =>
          (p.type === "ObjectProperty" || p.type === "ObjectMethod") &&
          getKeyName(p as ObjectProperty | ObjectMethod | SpreadElement) ===
            "set",
      );
      if (hasGet || hasSet) {
        const parts: string[] = [];
        if (hasGet) {
          parts.push("get");
        }
        if (hasSet) {
          parts.push("set");
        }
        detail = parts.join("/");
      }
    }

    // For props with type info
    if (category === "props" && prop.type === "ObjectProperty") {
      if (prop.value.type === "Identifier") {
        detail = prop.value.name; // e.g. String, Number
      } else if (prop.value.type === "ObjectExpression") {
        const typeProp = prop.value.properties.find(
          (p) =>
            (p.type === "ObjectProperty" || p.type === "ObjectMethod") &&
            getKeyName(p as ObjectProperty | ObjectMethod | SpreadElement) ===
              "type",
        );
        if (
          typeProp &&
          typeProp.type === "ObjectProperty" &&
          typeProp.value.type === "Identifier"
        ) {
          detail = typeProp.value.name;
        }
      }
    }

    children.push({
      label: name,
      category,
      line: loc.line,
      column: loc.column,
      detail,
      icon: MEMBER_ICONS[category],
    });
  }
  return children;
}

/**
 * Extract children from an array expression (e.g. `props: ['title', 'count']`).
 */
function extractArrayMembers(
  elements: Node[],
  category: HierarchyCategory,
  scriptStartLine: number,
): HierarchyNode[] {
  const children: HierarchyNode[] = [];
  for (const el of elements) {
    if (!el) {
      continue;
    }
    if (el.type === "StringLiteral") {
      const loc = getLoc(el, scriptStartLine);
      children.push({
        label: el.value,
        category,
        line: loc.line,
        column: loc.column,
        icon: MEMBER_ICONS[category],
      });
    }
  }
  return children;
}

/**
 * Parse a single option property and return a HierarchyNode (category level).
 */
function parseOptionProperty(
  prop: ObjectProperty | ObjectMethod,
  category: HierarchyCategory,
  scriptStartLine: number,
): HierarchyNode | null {
  const name = getKeyName(prop);
  if (!name) {
    return null;
  }
  const loc = getLoc(prop, scriptStartLine);

  // Lifecycle hooks are leaf nodes under the "lifecycle" category
  if (category === "lifecycle") {
    return {
      label: name,
      category: "lifecycle",
      line: loc.line,
      column: loc.column,
      icon: MEMBER_ICONS.lifecycle,
    };
  }

  // data can be a function or an object
  if (category === "data") {
    let dataBody: ObjectExpression | null = null;

    if (prop.type === "ObjectMethod") {
      // data() { return { ... } }
      const body = prop.body;
      const returnStmt = body.body.find((s) => s.type === "ReturnStatement");
      if (
        returnStmt &&
        returnStmt.type === "ReturnStatement" &&
        returnStmt.argument?.type === "ObjectExpression"
      ) {
        dataBody = returnStmt.argument;
      }
    } else if (prop.type === "ObjectProperty") {
      if (prop.value.type === "ObjectExpression") {
        dataBody = prop.value;
      } else if (
        prop.value.type === "ArrowFunctionExpression" ||
        prop.value.type === "FunctionExpression"
      ) {
        const fnBody = prop.value.body;
        if (fnBody.type === "ObjectExpression") {
          dataBody = fnBody;
        } else if (fnBody.type === "BlockStatement") {
          const returnStmt = fnBody.body.find(
            (s) => s.type === "ReturnStatement",
          );
          if (
            returnStmt &&
            returnStmt.type === "ReturnStatement" &&
            returnStmt.argument?.type === "ObjectExpression"
          ) {
            dataBody = returnStmt.argument;
          }
        }
      }
    }

    return {
      label: "data",
      category: "data",
      line: loc.line,
      column: loc.column,
      icon: CATEGORY_ICONS.data,
      children: dataBody
        ? extractObjectMembers(dataBody, "data", scriptStartLine)
        : [],
    };
  }

  // Categories that contain an object of members
  const objectCategories: HierarchyCategory[] = [
    "props",
    "computed",
    "methods",
    "watch",
    "components",
    "directives",
    "filters",
  ];
  if (objectCategories.includes(category)) {
    let children: HierarchyNode[] = [];

    if (prop.type === "ObjectProperty") {
      if (prop.value.type === "ObjectExpression") {
        children = extractObjectMembers(prop.value, category, scriptStartLine);
      } else if (prop.value.type === "ArrayExpression") {
        children = extractArrayMembers(
          prop.value.elements as Node[],
          category,
          scriptStartLine,
        );
      }
    }

    return {
      label: name,
      category,
      line: loc.line,
      column: loc.column,
      icon: CATEGORY_ICONS[category],
      children,
    };
  }

  // mixins, inject, emits — can be array or object
  if (category === "mixins" || category === "inject" || category === "emits") {
    let children: HierarchyNode[] = [];
    if (prop.type === "ObjectProperty") {
      if (prop.value.type === "ArrayExpression") {
        children = extractArrayMembers(
          prop.value.elements as Node[],
          category,
          scriptStartLine,
        );
      } else if (prop.value.type === "ObjectExpression") {
        children = extractObjectMembers(prop.value, category, scriptStartLine);
      }
    }
    return {
      label: name,
      category,
      line: loc.line,
      column: loc.column,
      icon: CATEGORY_ICONS[category],
      children,
    };
  }

  // provide — can be object or function
  if (category === "provide") {
    let children: HierarchyNode[] = [];
    if (
      prop.type === "ObjectProperty" &&
      prop.value.type === "ObjectExpression"
    ) {
      children = extractObjectMembers(prop.value, "provide", scriptStartLine);
    } else if (prop.type === "ObjectMethod") {
      const returnStmt = prop.body.body.find(
        (s) => s.type === "ReturnStatement",
      );
      if (
        returnStmt &&
        returnStmt.type === "ReturnStatement" &&
        returnStmt.argument?.type === "ObjectExpression"
      ) {
        children = extractObjectMembers(
          returnStmt.argument,
          "provide",
          scriptStartLine,
        );
      }
    }
    return {
      label: "provide",
      category: "provide",
      line: loc.line,
      column: loc.column,
      icon: CATEGORY_ICONS.provide,
      children,
    };
  }

  return null;
}

// ============================================================
//  Composition API / <script setup> parsing
// ============================================================

/**
 * Get the callee function name from a CallExpression.
 * Handles `ref()`, `Vue.ref()`, etc.
 */
function getCalleeName(node: CallExpression): string | null {
  if (node.callee.type === "Identifier") {
    return node.callee.name;
  }
  if (
    node.callee.type === "MemberExpression" &&
    node.callee.property.type === "Identifier"
  ) {
    return node.callee.property.name;
  }
  return null;
}

/**
 * Try to extract a TS type annotation string from a variable declarator.
 * e.g. `const name: Ref<string>` → "string"
 * e.g. `const name = ref<number>(0)` → "number"
 */
function extractTypeHint(node: Node, callExpr?: CallExpression): string | undefined {
  // Check generic type parameter on the call: ref<string>(...)
  if (callExpr?.typeParameters && callExpr.typeParameters.type === "TSTypeParameterInstantiation") {
    const params = callExpr.typeParameters.params;
    if (params.length > 0) {
      const first = params[0];
      if (first.type === "TSTypeReference" && first.typeName.type === "Identifier") {
        return first.typeName.name;
      }
      if (first.type === "TSStringKeyword") { return "string"; }
      if (first.type === "TSNumberKeyword") { return "number"; }
      if (first.type === "TSBooleanKeyword") { return "boolean"; }
      if (first.type === "TSArrayType") { return "Array"; }
      if (first.type === "TSTypeLiteral") { return "Object"; }
      // For union types, e.g. string | null
      if (first.type === "TSUnionType") {
        return first.types
          .map((t) => {
            if (t.type === "TSTypeReference" && t.typeName.type === "Identifier") { return t.typeName.name; }
            if (t.type === "TSStringKeyword") { return "string"; }
            if (t.type === "TSNumberKeyword") { return "number"; }
            if (t.type === "TSBooleanKeyword") { return "boolean"; }
            if (t.type === "TSNullKeyword") { return "null"; }
            if (t.type === "TSUndefinedKeyword") { return "undefined"; }
            return "?";
          })
          .join(" | ");
      }
    }
  }

  // Check variable type annotation: const x: Ref<string> = ...
  if (node.type === "VariableDeclarator" && node.id.type === "Identifier") {
    const ann = (node.id as any).typeAnnotation as TSTypeAnnotation | undefined;
    if (ann && ann.type === "TSTypeAnnotation") {
      const tsType = ann.typeAnnotation;
      if (tsType.type === "TSTypeReference" && tsType.typeName.type === "Identifier") {
        // Extract inner type from Ref<T>, ComputedRef<T> etc.
        if (tsType.typeParameters && tsType.typeParameters.params.length > 0) {
          const inner = tsType.typeParameters.params[0];
          if (inner.type === "TSTypeReference" && inner.typeName.type === "Identifier") {
            return inner.typeName.name;
          }
          if (inner.type === "TSStringKeyword") { return "string"; }
          if (inner.type === "TSNumberKeyword") { return "number"; }
          if (inner.type === "TSBooleanKeyword") { return "boolean"; }
        }
        return tsType.typeName.name;
      }
      if (tsType.type === "TSStringKeyword") { return "string"; }
      if (tsType.type === "TSNumberKeyword") { return "number"; }
      if (tsType.type === "TSBooleanKeyword") { return "boolean"; }
    }
  }

  return undefined;
}

/**
 * Extract prop names from defineProps() call.
 * Handles both runtime and type-only declarations:
 *   defineProps({ title: String })
 *   defineProps(['title', 'count'])
 *   defineProps<{ title: string; count: number }>()
 *   withDefaults(defineProps<{ title?: string }>(), { title: 'hi' })
 */
function parseDefineProps(
  callExpr: CallExpression,
  scriptStartLine: number,
): HierarchyNode[] {
  const children: HierarchyNode[] = [];

  // Check for type-only props: defineProps<{ ... }>()
  if (
    callExpr.typeParameters &&
    callExpr.typeParameters.type === "TSTypeParameterInstantiation" &&
    callExpr.typeParameters.params.length > 0
  ) {
    const typeParam = callExpr.typeParameters.params[0];
    if (typeParam.type === "TSTypeLiteral") {
      for (const member of typeParam.members) {
        if (
          member.type === "TSPropertySignature" &&
          member.key.type === "Identifier"
        ) {
          let detail: string | undefined;
          if (member.typeAnnotation?.type === "TSTypeAnnotation") {
            const tsType = member.typeAnnotation.typeAnnotation;
            if (tsType.type === "TSStringKeyword") { detail = "string"; }
            else if (tsType.type === "TSNumberKeyword") { detail = "number"; }
            else if (tsType.type === "TSBooleanKeyword") { detail = "boolean"; }
            else if (tsType.type === "TSArrayType") { detail = "Array"; }
            else if (tsType.type === "TSTypeReference" && tsType.typeName.type === "Identifier") {
              detail = tsType.typeName.name;
            }
            else if (tsType.type === "TSUnionType") {
              detail = tsType.types.map((t) => {
                if (t.type === "TSTypeReference" && t.typeName.type === "Identifier") { return t.typeName.name; }
                if (t.type === "TSStringKeyword") { return "string"; }
                if (t.type === "TSNumberKeyword") { return "number"; }
                if (t.type === "TSBooleanKeyword") { return "boolean"; }
                if (t.type === "TSNullKeyword") { return "null"; }
                return "?";
              }).join(" | ");
            }
          }
          if (member.optional) {
            detail = detail ? `${detail}?` : "?";
          }
          const loc = getLoc(member, scriptStartLine);
          children.push({
            label: member.key.name,
            category: "props",
            line: loc.line,
            column: loc.column,
            detail,
            icon: MEMBER_ICONS.props,
          });
        }
      }
    }
    // Type could also be a TSTypeReference (interface name), skip extraction for now
    return children;
  }

  // Runtime props: defineProps({ ... }) or defineProps(['a', 'b'])
  if (callExpr.arguments.length > 0) {
    const arg = callExpr.arguments[0];
    if (arg.type === "ObjectExpression") {
      return extractObjectMembers(arg, "props", scriptStartLine);
    }
    if (arg.type === "ArrayExpression") {
      return extractArrayMembers(arg.elements as Node[], "props", scriptStartLine);
    }
  }

  return children;
}

/**
 * Extract emit names from defineEmits() call.
 *   defineEmits(['update', 'close'])
 *   defineEmits<{ (e: 'update', value: string): void }>()
 *   defineEmits({ update: null })
 */
function parseDefineEmits(
  callExpr: CallExpression,
  scriptStartLine: number,
): HierarchyNode[] {
  const children: HierarchyNode[] = [];

  // Type-only emits
  if (
    callExpr.typeParameters &&
    callExpr.typeParameters.type === "TSTypeParameterInstantiation" &&
    callExpr.typeParameters.params.length > 0
  ) {
    const typeParam = callExpr.typeParameters.params[0];
    if (typeParam.type === "TSTypeLiteral") {
      for (const member of typeParam.members) {
        // (e: 'update', value: string): void
        if (member.type === "TSCallSignatureDeclaration" && member.parameters.length > 0) {
          const firstParam = member.parameters[0];
          if (
            firstParam.type === "Identifier" &&
            (firstParam as any).typeAnnotation?.typeAnnotation?.type === "TSLiteralType" &&
            (firstParam as any).typeAnnotation.typeAnnotation.literal.type === "StringLiteral"
          ) {
            const emitName = (firstParam as any).typeAnnotation.typeAnnotation.literal.value;
            const loc = getLoc(member, scriptStartLine);
            children.push({
              label: emitName,
              category: "emits",
              line: loc.line,
              column: loc.column,
              icon: MEMBER_ICONS.emits,
            });
          }
        }
        // Property-style: { update: [value: string] }
        if (
          member.type === "TSPropertySignature" &&
          member.key.type === "Identifier"
        ) {
          const loc = getLoc(member, scriptStartLine);
          children.push({
            label: member.key.name,
            category: "emits",
            line: loc.line,
            column: loc.column,
            icon: MEMBER_ICONS.emits,
          });
        }
      }
    }
    return children;
  }

  // Runtime emits
  if (callExpr.arguments.length > 0) {
    const arg = callExpr.arguments[0];
    if (arg.type === "ArrayExpression") {
      return extractArrayMembers(arg.elements as Node[], "emits", scriptStartLine);
    }
    if (arg.type === "ObjectExpression") {
      return extractObjectMembers(arg, "emits", scriptStartLine);
    }
  }

  return children;
}

/**
 * Extract exposed members from defineExpose() call.
 *   defineExpose({ submit, reset })
 */
function parseDefineExpose(
  callExpr: CallExpression,
  scriptStartLine: number,
): HierarchyNode[] {
  if (callExpr.arguments.length > 0 && callExpr.arguments[0].type === "ObjectExpression") {
    return extractObjectMembers(callExpr.arguments[0], "expose", scriptStartLine);
  }
  return [];
}

/**
 * Extract watch source description from watch() first argument.
 */
function getWatchSource(callExpr: CallExpression): string {
  if (callExpr.arguments.length === 0) { return ""; }
  const src = callExpr.arguments[0];
  if (src.type === "Identifier") { return src.name; }
  if (src.type === "ArrowFunctionExpression" || src.type === "FunctionExpression") {
    // () => foo.bar  →  try to get a simple representation
    const body = src.body;
    if (body.type === "MemberExpression") {
      if (body.object.type === "Identifier" && body.property.type === "Identifier") {
        return `${body.object.name}.${body.property.name}`;
      }
    }
    if (body.type === "Identifier") { return body.name; }
    return "()";
  }
  if (src.type === "ArrayExpression") {
    const names = src.elements
      .map((el) => (el && el.type === "Identifier" ? el.name : "?"))
      .join(", ");
    return `[${names}]`;
  }
  return "";
}

/**
 * Parse <script setup> AST and return hierarchy nodes.
 */
function parseScriptSetup(
  ast: ReturnType<typeof babelParse>,
  scriptStartLine: number,
): HierarchyNode[] {
  const propsChildren: HierarchyNode[] = [];
  const emitsChildren: HierarchyNode[] = [];
  const exposeChildren: HierarchyNode[] = [];
  const stateChildren: HierarchyNode[] = [];
  const computedChildren: HierarchyNode[] = [];
  const watchChildren: HierarchyNode[] = [];
  const lifecycleChildren: HierarchyNode[] = [];
  const composableChildren: HierarchyNode[] = [];
  const provideChildren: HierarchyNode[] = [];
  const injectChildren: HierarchyNode[] = [];

  // Track first-seen locations for category headers
  let propsLoc: { line: number; column: number } | null = null;
  let emitsLoc: { line: number; column: number } | null = null;
  let exposeLoc: { line: number; column: number } | null = null;

  for (const stmt of ast.program.body) {
    // --- Variable declarations ---
    // const count = ref(0), const user = reactive({...}), const fullName = computed(...)
    if (stmt.type === "VariableDeclaration") {
      for (const decl of stmt.declarations) {
        if (!decl.init || decl.init.type !== "CallExpression") {
          continue;
        }

        const callExpr = decl.init;
        const calleeName = getCalleeName(callExpr);
        if (!calleeName) { continue; }

        const loc = getLoc(stmt, scriptStartLine);

        // --- defineProps ---
        if (calleeName === "defineProps") {
          if (!propsLoc) { propsLoc = loc; }
          propsChildren.push(...parseDefineProps(callExpr, scriptStartLine));
          continue;
        }

        // --- withDefaults(defineProps<...>(), {...}) ---
        if (calleeName === "withDefaults" && callExpr.arguments.length >= 1) {
          const inner = callExpr.arguments[0];
          if (inner.type === "CallExpression") {
            const innerName = getCalleeName(inner);
            if (innerName === "defineProps") {
              if (!propsLoc) { propsLoc = loc; }
              propsChildren.push(...parseDefineProps(inner, scriptStartLine));
            }
          }
          continue;
        }

        // --- defineEmits ---
        if (calleeName === "defineEmits") {
          if (!emitsLoc) { emitsLoc = loc; }
          emitsChildren.push(...parseDefineEmits(callExpr, scriptStartLine));
          continue;
        }

        // --- ref / reactive / shallowRef / shallowReactive / ... ---
        if ((REACTIVE_STATE_FUNCTIONS as readonly string[]).includes(calleeName)) {
          const varName = decl.id.type === "Identifier" ? decl.id.name : "?";
          const typeHint = extractTypeHint(decl, callExpr);
          stateChildren.push({
            label: varName,
            category: "state",
            line: loc.line,
            column: loc.column,
            detail: typeHint ? `${calleeName}<${typeHint}>` : calleeName,
            icon: MEMBER_ICONS.state,
          });
          continue;
        }

        // --- computed ---
        if (calleeName === "computed") {
          const varName = decl.id.type === "Identifier" ? decl.id.name : "?";
          const typeHint = extractTypeHint(decl, callExpr);
          computedChildren.push({
            label: varName,
            category: "computed",
            line: loc.line,
            column: loc.column,
            detail: typeHint,
            icon: MEMBER_ICONS.computed,
          });
          continue;
        }

        // --- inject ---
        if (calleeName === "inject") {
          const varName = decl.id.type === "Identifier" ? decl.id.name : "?";
          let keyName: string | undefined;
          if (callExpr.arguments.length > 0) {
            const arg0 = callExpr.arguments[0];
            if (arg0.type === "StringLiteral") { keyName = arg0.value; }
            else if (arg0.type === "Identifier") { keyName = arg0.name; }
          }
          injectChildren.push({
            label: varName,
            category: "inject",
            line: loc.line,
            column: loc.column,
            detail: keyName,
            icon: MEMBER_ICONS.inject,
          });
          continue;
        }

        // --- useXxx() composable ---
        if (calleeName.startsWith("use") && calleeName.length > 3) {
          const varName = decl.id.type === "Identifier" ? decl.id.name
            : decl.id.type === "ObjectPattern" ? `{ ${decl.id.properties.map((p) => {
                if (p.type === "ObjectProperty" && p.key.type === "Identifier") { return p.key.name; }
                if (p.type === "RestElement" && p.argument.type === "Identifier") { return `...${p.argument.name}`; }
                return "?";
              }).join(", ")} }`
            : "?";
          composableChildren.push({
            label: calleeName,
            category: "composables",
            line: loc.line,
            column: loc.column,
            detail: varName !== calleeName ? `→ ${varName}` : undefined,
            icon: MEMBER_ICONS.composables,
          });
          continue;
        }
      }
    }

    // --- Expression statements (no variable binding) ---
    // e.g. defineExpose({ ... }), onMounted(() => { ... }), watch(...)
    if (stmt.type === "ExpressionStatement" && stmt.expression.type === "CallExpression") {
      const callExpr = stmt.expression;
      const calleeName = getCalleeName(callExpr);
      if (!calleeName) { continue; }

      const loc = getLoc(stmt, scriptStartLine);

      // --- defineProps (without assignment) ---
      if (calleeName === "defineProps") {
        if (!propsLoc) { propsLoc = loc; }
        propsChildren.push(...parseDefineProps(callExpr, scriptStartLine));
        continue;
      }

      // --- withDefaults ---
      if (calleeName === "withDefaults" && callExpr.arguments.length >= 1) {
        const inner = callExpr.arguments[0];
        if (inner.type === "CallExpression") {
          const innerName = getCalleeName(inner);
          if (innerName === "defineProps") {
            if (!propsLoc) { propsLoc = loc; }
            propsChildren.push(...parseDefineProps(inner, scriptStartLine));
          }
        }
        continue;
      }

      // --- defineEmits (without assignment) ---
      if (calleeName === "defineEmits") {
        if (!emitsLoc) { emitsLoc = loc; }
        emitsChildren.push(...parseDefineEmits(callExpr, scriptStartLine));
        continue;
      }

      // --- defineExpose ---
      if (calleeName === "defineExpose") {
        if (!exposeLoc) { exposeLoc = loc; }
        exposeChildren.push(...parseDefineExpose(callExpr, scriptStartLine));
        continue;
      }

      // --- Lifecycle hooks ---
      if ((COMPOSITION_LIFECYCLE_HOOKS as readonly string[]).includes(calleeName)) {
        lifecycleChildren.push({
          label: calleeName,
          category: "lifecycle",
          line: loc.line,
          column: loc.column,
          icon: MEMBER_ICONS.lifecycle,
        });
        continue;
      }

      // --- watch / watchEffect / watchPostEffect / watchSyncEffect ---
      if ((WATCH_FUNCTIONS as readonly string[]).includes(calleeName)) {
        let label = calleeName;
        if (calleeName === "watch") {
          const source = getWatchSource(callExpr);
          if (source) { label = `watch(${source})`; }
        }
        watchChildren.push({
          label,
          category: "watch",
          line: loc.line,
          column: loc.column,
          icon: MEMBER_ICONS.watch,
        });
        continue;
      }

      // --- provide ---
      if (calleeName === "provide") {
        let keyName = "?";
        if (callExpr.arguments.length > 0) {
          const arg0 = callExpr.arguments[0];
          if (arg0.type === "StringLiteral") { keyName = arg0.value; }
          else if (arg0.type === "Identifier") { keyName = arg0.name; }
        }
        provideChildren.push({
          label: keyName,
          category: "provide",
          line: loc.line,
          column: loc.column,
          icon: MEMBER_ICONS.provide,
        });
        continue;
      }
    }

    // --- Also handle variable-assigned watch/lifecycle (less common but valid) ---
    // e.g. const stop = watch(...)
    if (stmt.type === "VariableDeclaration") {
      for (const decl of stmt.declarations) {
        if (!decl.init || decl.init.type !== "CallExpression") { continue; }
        const callExpr = decl.init;
        const calleeName = getCalleeName(callExpr);
        if (!calleeName) { continue; }
        const loc = getLoc(stmt, scriptStartLine);

        if ((WATCH_FUNCTIONS as readonly string[]).includes(calleeName)) {
          let label = calleeName;
          if (calleeName === "watch") {
            const source = getWatchSource(callExpr);
            if (source) { label = `watch(${source})`; }
          }
          // Avoid duplicates — check if already added in expression pass
          const alreadyExists = watchChildren.some(
            (w) => w.line === loc.line && w.column === loc.column,
          );
          if (!alreadyExists) {
            watchChildren.push({
              label,
              category: "watch",
              line: loc.line,
              column: loc.column,
              detail: decl.id.type === "Identifier" ? `→ ${decl.id.name}` : undefined,
              icon: MEMBER_ICONS.watch,
            });
          }
          continue;
        }
      }
    }

    // --- Function declarations (top-level functions as methods) ---
    if (stmt.type === "FunctionDeclaration" && stmt.id) {
      // Skip composable-like functions that start with "use"
      if (!stmt.id.name.startsWith("use")) {
        // This is not auto-grouped; we could add a "functions" category
        // For now, skip — they don't map to a standard Vue concept
      }
    }
  }

  // --- Assemble category nodes ---
  const result: HierarchyNode[] = [];

  if (propsChildren.length > 0) {
    result.push({
      label: "props",
      category: "props",
      line: propsLoc?.line ?? 0,
      column: propsLoc?.column ?? 0,
      icon: CATEGORY_ICONS.props,
      children: propsChildren,
    });
  }

  if (emitsChildren.length > 0) {
    result.push({
      label: "emits",
      category: "emits",
      line: emitsLoc?.line ?? 0,
      column: emitsLoc?.column ?? 0,
      icon: CATEGORY_ICONS.emits,
      children: emitsChildren,
    });
  }

  if (stateChildren.length > 0) {
    result.push({
      label: "state",
      category: "state",
      line: stateChildren[0].line,
      column: stateChildren[0].column,
      icon: CATEGORY_ICONS.state,
      children: stateChildren,
    });
  }

  if (computedChildren.length > 0) {
    result.push({
      label: "computed",
      category: "computed",
      line: computedChildren[0].line,
      column: computedChildren[0].column,
      icon: CATEGORY_ICONS.computed,
      children: computedChildren,
    });
  }

  if (watchChildren.length > 0) {
    result.push({
      label: "watch",
      category: "watch",
      line: watchChildren[0].line,
      column: watchChildren[0].column,
      icon: CATEGORY_ICONS.watch,
      children: watchChildren,
    });
  }

  if (lifecycleChildren.length > 0) {
    result.push({
      label: "lifecycle",
      category: "lifecycle",
      line: lifecycleChildren[0].line,
      column: lifecycleChildren[0].column,
      icon: CATEGORY_ICONS.lifecycle,
      children: lifecycleChildren,
    });
  }

  if (provideChildren.length > 0) {
    result.push({
      label: "provide",
      category: "provide",
      line: provideChildren[0].line,
      column: provideChildren[0].column,
      icon: CATEGORY_ICONS.provide,
      children: provideChildren,
    });
  }

  if (injectChildren.length > 0) {
    result.push({
      label: "inject",
      category: "inject",
      line: injectChildren[0].line,
      column: injectChildren[0].column,
      icon: CATEGORY_ICONS.inject,
      children: injectChildren,
    });
  }

  if (composableChildren.length > 0) {
    result.push({
      label: "composables",
      category: "composables",
      line: composableChildren[0].line,
      column: composableChildren[0].column,
      icon: CATEGORY_ICONS.composables,
      children: composableChildren,
    });
  }

  if (exposeChildren.length > 0) {
    result.push({
      label: "expose",
      category: "expose",
      line: exposeLoc?.line ?? 0,
      column: exposeLoc?.column ?? 0,
      icon: CATEGORY_ICONS.expose,
      children: exposeChildren,
    });
  }

  return result;
}

/**
 * Find the `export default` object expression in the AST.
 */
function findExportDefault(
  ast: ReturnType<typeof babelParse>,
): ObjectExpression | null {
  for (const node of ast.program.body) {
    if (node.type === "ExportDefaultDeclaration") {
      const decl = node.declaration;
      if (decl.type === "ObjectExpression") {
        return decl;
      }
      // Handle `export default defineComponent({ ... })`
      if (
        decl.type === "CallExpression" &&
        decl.arguments.length > 0 &&
        decl.arguments[0].type === "ObjectExpression"
      ) {
        if (
          (decl.callee.type === "Identifier" &&
            decl.callee.name === "defineComponent") ||
          (decl.callee.type === "MemberExpression" &&
            decl.callee.property.type === "Identifier" &&
            decl.callee.property.name === "defineComponent")
        ) {
          return decl.arguments[0] as ObjectExpression;
        }
      }
    }
  }
  return null;
}

// ============================================================
//  Template reference scanning & method call graph
// ============================================================

/** JS built-in names to ignore when matching template identifiers */
const JS_BUILTIN_BLACKLIST = new Set([
  "true", "false", "null", "undefined", "NaN", "Infinity",
  "console", "Math", "Object", "Array", "JSON", "Date", "RegExp",
  "parseInt", "parseFloat", "isNaN", "isFinite",
  "window", "document", "navigator", "location",
  "$event", "arguments", "this",
  "String", "Number", "Boolean", "Symbol", "BigInt",
  "Map", "Set", "WeakMap", "WeakSet", "Promise",
  "typeof", "instanceof", "void", "delete", "new", "in", "of",
  "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return",
  "let", "const", "var", "function", "class",
  "index", "key", "item", "el", "e", "i", "j", "k", "v", "n",
]);

/** Identifier regex */
const IDENT_RE = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

/**
 * Extract identifiers from a template expression string, filtering against known names.
 */
function extractIdentifiers(expr: string, knownNames: Set<string>): string[] {
  const found: string[] = [];
  let m: RegExpExecArray | null;
  IDENT_RE.lastIndex = 0;
  while ((m = IDENT_RE.exec(expr)) !== null) {
    const name = m[1];
    if (knownNames.has(name) && !JS_BUILTIN_BLACKLIST.has(name)) {
      found.push(name);
    }
  }
  return [...new Set(found)];
}

interface ScanResult {
  /** identifier → list of template references */
  refs: Map<string, TemplateRef[]>;
  /** method name → list of event bindings */
  eventBindings: Map<string, EventBinding[]>;
}

/**
 * Scan template text for references to known identifiers.
 * Returns ref counts and event binding info.
 */
function scanTemplateRefs(
  templateContent: string,
  templateStartLine: number,
  knownNames: Set<string>,
): ScanResult {
  const refs = new Map<string, TemplateRef[]>();
  const eventBindings = new Map<string, EventBinding[]>();
  const lines = templateContent.split("\n");

  function addRef(name: string, line0: number, type: string, context: string) {
    if (!refs.has(name)) { refs.set(name, []); }
    refs.get(name)!.push({ line: line0, type, context });
  }

  function addEventBinding(handlerName: string, eventName: string, line0: number) {
    if (!eventBindings.has(handlerName)) { eventBindings.set(handlerName, []); }
    eventBindings.get(handlerName)!.push({ event: eventName, line: line0 });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const absLine = templateStartLine + i; // 0-based absolute line

    // --- Interpolation: {{ expr }} ---
    const interpRe = /\{\{\s*(.+?)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = interpRe.exec(line)) !== null) {
      for (const id of extractIdentifiers(m[1], knownNames)) {
        addRef(id, absLine, "{{ }}", "{{ }}");
      }
    }

    // --- Event bindings: @event="handler" or v-on:event="handler" ---
    const eventRe = /(?:@|v-on:)([\w.-]+)="([^"]+)"/g;
    while ((m = eventRe.exec(line)) !== null) {
      const eventName = m[1];
      const handler = m[2].trim();
      // Check if handler is a pure identifier (method name) vs inline expression
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(handler)) {
        // Pure method name
        if (knownNames.has(handler)) {
          addRef(handler, absLine, "event", `@${eventName}`);
          addEventBinding(handler, eventName, absLine);
        }
      } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*\(/.test(handler)) {
        // Method call like handleSubmit($event) or handleSubmit(item)
        const fnName = handler.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\(/)?.[1];
        if (fnName && knownNames.has(fnName)) {
          addRef(fnName, absLine, "event", `@${eventName}`);
          addEventBinding(fnName, eventName, absLine);
        }
        // Also extract identifiers from arguments
        for (const id of extractIdentifiers(handler, knownNames)) {
          if (id !== fnName) {
            addRef(id, absLine, "event", `@${eventName}`);
          }
        }
      } else {
        // Inline expression: count++, show = true, etc.
        for (const id of extractIdentifiers(handler, knownNames)) {
          addRef(id, absLine, "event", `@${eventName}`);
        }
      }
    }

    // --- v-for: v-for="item in items" or v-for="(item, index) in items" ---
    const vforRe = /v-for="[^"]*\b(?:in|of)\s+([^"]+)"/g;
    while ((m = vforRe.exec(line)) !== null) {
      for (const id of extractIdentifiers(m[1], knownNames)) {
        addRef(id, absLine, "v-for", "v-for");
      }
    }

    // --- v-if / v-else-if / v-show ---
    const condRe = /(?:v-if|v-else-if|v-show)="([^"]+)"/g;
    while ((m = condRe.exec(line)) !== null) {
      const directive = m[0].startsWith("v-show") ? "v-show"
        : m[0].startsWith("v-else-if") ? "v-else-if" : "v-if";
      for (const id of extractIdentifiers(m[1], knownNames)) {
        addRef(id, absLine, directive, directive);
      }
    }

    // --- v-model ---
    const vmodelRe = /v-model(?::[a-zA-Z]+)?="([^"]+)"/g;
    while ((m = vmodelRe.exec(line)) !== null) {
      for (const id of extractIdentifiers(m[1], knownNames)) {
        addRef(id, absLine, "v-model", "v-model");
      }
    }

    // --- v-bind / shorthand :attr="expr" ---
    // Must run after event/v-for/v-if/v-model to avoid double-matching
    const bindRe = /(?::|\bv-bind:)([\w.-]+)="([^"]+)"/g;
    while ((m = bindRe.exec(line)) !== null) {
      const attr = m[1];
      // Skip if this was already matched by v-if, v-for, v-model, v-show, @event
      if (attr === "key" || attr === "ref") { continue; }
      for (const id of extractIdentifiers(m[2], knownNames)) {
        addRef(id, absLine, `:${attr}`, `:${attr}`);
      }
    }
  }

  return { refs, eventBindings };
}

/**
 * Scan method bodies for calls to other known methods.
 * Options API: matches `this.methodName(` pattern.
 * Composition API: matches direct `methodName(` pattern against known function names.
 */
function scanMethodCalls(
  scriptContent: string,
  scriptStartLine: number,
  methodNodes: HierarchyNode[],
  isSetup: boolean,
): Map<string, string[]> {
  const callMap = new Map<string, string[]>();
  const methodNames = new Set(methodNodes.map((n) => n.label));
  const lines = scriptContent.split("\n");

  for (const methodNode of methodNodes) {
    // Find the method body range (approximate: from method line to next method line or end)
    const startLine = methodNode.line - scriptStartLine;
    // Find next method that starts after this one
    const nextMethod = methodNodes
      .filter((n) => n.line > methodNode.line)
      .sort((a, b) => a.line - b.line)[0];
    const endLine = nextMethod
      ? nextMethod.line - scriptStartLine
      : lines.length;

    const bodyLines = lines.slice(Math.max(0, startLine), Math.min(lines.length, endLine));
    const bodyText = bodyLines.join("\n");

    const calls: string[] = [];
    if (isSetup) {
      // Composition API: direct function calls
      const directCallRe = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = directCallRe.exec(bodyText)) !== null) {
        const calledName = m[1];
        if (calledName !== methodNode.label && methodNames.has(calledName)) {
          if (!calls.includes(calledName)) { calls.push(calledName); }
        }
      }
    } else {
      // Options API: this.methodName(
      const thisCallRe = /this\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = thisCallRe.exec(bodyText)) !== null) {
        const calledName = m[1];
        if (calledName !== methodNode.label && methodNames.has(calledName)) {
          if (!calls.includes(calledName)) { calls.push(calledName); }
        }
      }
    }

    if (calls.length > 0) {
      callMap.set(methodNode.label, calls);
    }
  }

  return callMap;
}

/**
 * Collect all known member names from parsed categories for template ref matching.
 */
function collectKnownNames(categories: HierarchyNode[]): Set<string> {
  const names = new Set<string>();
  const memberCategories: HierarchyCategory[] = [
    "props", "data", "computed", "methods", "state", "composables",
  ];
  for (const cat of categories) {
    if (memberCategories.includes(cat.category) && cat.children) {
      for (const child of cat.children) {
        names.add(child.label);
      }
    }
  }
  return names;
}

/**
 * Apply template scan results back onto the hierarchy nodes.
 */
function applyTemplateRefs(
  categories: HierarchyNode[],
  scanResult: ScanResult,
): void {
  for (const cat of categories) {
    if (!cat.children) { continue; }
    for (const child of cat.children) {
      // Apply ref counts
      const refs = scanResult.refs.get(child.label);
      if (refs && refs.length > 0) {
        child.refCount = refs.length;
        child.refs = refs;
        // Append to detail
        const refSuffix = `⟵ ×${refs.length}`;
        child.detail = child.detail ? `${child.detail}  ${refSuffix}` : refSuffix;
      }

      // Apply event bindings (for methods)
      const bindings = scanResult.eventBindings.get(child.label);
      if (bindings && bindings.length > 0) {
        child.eventBindings = bindings;
      }
    }
  }
}

/**
 * Apply method call graph results onto hierarchy nodes.
 */
function applyMethodCalls(
  categories: HierarchyNode[],
  callMap: Map<string, string[]>,
): void {
  // Find methods category
  const methodsCat = categories.find(
    (c) => c.category === "methods" || c.category === "state",
  );
  if (!methodsCat?.children) { return; }

  // Build calledBy reverse map
  const calledByMap = new Map<string, string[]>();
  for (const [caller, callees] of callMap) {
    for (const callee of callees) {
      if (!calledByMap.has(callee)) { calledByMap.set(callee, []); }
      calledByMap.get(callee)!.push(caller);
    }
  }

  // Apply to nodes
  for (const child of methodsCat.children) {
    const calls = callMap.get(child.label);
    if (calls) { child.calls = calls; }

    const calledBy = calledByMap.get(child.label);
    if (calledBy) { child.calledBy = calledBy; }
  }
}

/**
 * Build the interface overview node from existing props and emits categories.
 */
function buildInterfaceNode(categories: HierarchyNode[]): HierarchyNode | null {
  const propsCat = categories.find((c) => c.category === "props");
  const emitsCat = categories.find((c) => c.category === "emits");

  if (!propsCat && !emitsCat) { return null; }

  const interfaceChildren: HierarchyNode[] = [];

  if (propsCat && propsCat.children && propsCat.children.length > 0) {
    interfaceChildren.push({
      label: `→ props (${propsCat.children.length})`,
      category: "interface",
      line: propsCat.line,
      column: propsCat.column,
      icon: "arrow-right",
      children: propsCat.children.map((c) => ({ ...c })),
    });
  }

  if (emitsCat && emitsCat.children && emitsCat.children.length > 0) {
    interfaceChildren.push({
      label: `← emits (${emitsCat.children.length})`,
      category: "interface",
      line: emitsCat.line,
      column: emitsCat.column,
      icon: "arrow-left",
      children: emitsCat.children.map((c) => ({ ...c })),
    });
  }

  if (interfaceChildren.length === 0) { return null; }

  const firstLine = propsCat?.line ?? emitsCat?.line ?? 0;
  return {
    label: "interface",
    category: "interface",
    line: firstLine,
    column: 0,
    icon: CATEGORY_ICONS.interface,
    children: interfaceChildren,
  };
}

/**
 * Parse a Vue SFC file content and return the hierarchy structure.
 */
export function parseVueFile(content: string, filePath: string): ParseResult {
  const warnings: string[] = [];
  const categories: HierarchyNode[] = [];

  try {
    const { descriptor, errors } = parseSFC(content, {
      filename: filePath,
    });

    if (errors.length > 0) {
      warnings.push(...errors.map((e) => e.message));
    }

    // --- Handle <template> block ---
    if (descriptor.template) {
      const templateStart = descriptor.template.loc.start.line - 1; // 0-based
      categories.push({
        label: "template",
        category: "template",
        line: templateStart,
        column: 0,
        icon: CATEGORY_ICONS.template,
      });
    }

    // --- Handle <script> or <script setup> block ---
    const scriptBlock = descriptor.script || descriptor.scriptSetup;
    if (scriptBlock && scriptBlock.content) {
      const isTS = scriptBlock.lang === "ts" || scriptBlock.lang === "tsx";
      const scriptStartLine = scriptBlock.loc.start.line - 1; // 0-based

      let ast;
      try {
        ast = babelParse(scriptBlock.content, {
          sourceType: "module",
          plugins: [
            isTS ? "typescript" : undefined,
            "decorators-legacy",
            "classProperties",
            "objectRestSpread",
          ].filter(Boolean) as any[],
          errorRecovery: true,
        });
      } catch (parseErr: any) {
        warnings.push(`Script parse error: ${parseErr.message}`);
        return { categories, filePath, timestamp: Date.now(), warnings };
      }

      if (descriptor.scriptSetup) {
        // --- Composition API / <script setup> ---
        const setupNodes = parseScriptSetup(ast, scriptStartLine);
        categories.push(...setupNodes);
      } else {
        // --- Options API (export default { ... }) ---
        const componentObj = findExportDefault(ast);
        if (componentObj) {
          // Group lifecycle hooks
          const lifecycleNodes: HierarchyNode[] = [];

          for (const prop of componentObj.properties) {
            if (prop.type === "SpreadElement") {
              continue;
            }
            const keyName = getKeyName(prop);
            if (!keyName) {
              continue;
            }
            const category = keyToCategory(keyName);
            if (!category) {
              continue;
            }

            const node = parseOptionProperty(prop, category, scriptStartLine);
            if (!node) {
              continue;
            }

            if (category === "lifecycle") {
              lifecycleNodes.push(node);
            } else {
              categories.push(node);
            }
          }

          // Add lifecycle as a group
          if (lifecycleNodes.length > 0) {
            // Use the first lifecycle hook's position for the category
            categories.push({
              label: "lifecycle",
              category: "lifecycle",
              line: lifecycleNodes[0].line,
              column: lifecycleNodes[0].column,
              icon: CATEGORY_ICONS.lifecycle,
              children: lifecycleNodes,
            });
          }
        }
      }
    }

    // --- Handle <style> blocks ---
    if (descriptor.styles.length > 0) {
      const firstStyle = descriptor.styles[0];
      const styleLine = firstStyle.loc.start.line - 1;
      const scoped = descriptor.styles.some((s) => s.scoped);
      categories.push({
        label: scoped ? "style (scoped)" : "style",
        category: "style",
        line: styleLine,
        column: 0,
        icon: CATEGORY_ICONS.style,
        detail:
          descriptor.styles.length > 1
            ? `${descriptor.styles.length} blocks`
            : undefined,
      });
    }

    // --- Template reference scanning ---
    if (descriptor.template?.content) {
      const templateStartLine = descriptor.template.loc.start.line - 1;
      const knownNames = collectKnownNames(categories);
      if (knownNames.size > 0) {
        const scanResult = scanTemplateRefs(
          descriptor.template.content,
          templateStartLine,
          knownNames,
        );
        applyTemplateRefs(categories, scanResult);
      }
    }

    // --- Method call graph ---
    const scriptBlock2 = descriptor.script || descriptor.scriptSetup;
    if (scriptBlock2?.content) {
      const isSetup = !!descriptor.scriptSetup;
      const scriptStartLine2 = scriptBlock2.loc.start.line - 1;
      const methodsCat = categories.find((c) => c.category === "methods");
      if (methodsCat?.children && methodsCat.children.length > 0) {
        const callMap = scanMethodCalls(
          scriptBlock2.content,
          scriptStartLine2,
          methodsCat.children,
          isSetup,
        );
        if (callMap.size > 0) {
          applyMethodCalls(categories, callMap);
        }
      }
    }

    // --- Interface overview node ---
    const interfaceNode = buildInterfaceNode(categories);
    if (interfaceNode) {
      // Remove standalone props/emits nodes (they are now inside interface)
      for (let i = categories.length - 1; i >= 0; i--) {
        if (categories[i].category === "props" || categories[i].category === "emits") {
          categories.splice(i, 1);
        }
      }
      // Insert after template node, before other categories
      const templateIdx = categories.findIndex((c) => c.category === "template");
      if (templateIdx >= 0) {
        categories.splice(templateIdx + 1, 0, interfaceNode);
      } else {
        categories.unshift(interfaceNode);
      }
    }
  } catch (err: any) {
    warnings.push(`Parse error: ${err.message}`);
  }

  return {
    categories,
    filePath,
    timestamp: Date.now(),
    warnings,
  };
}
