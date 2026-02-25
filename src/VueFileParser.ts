import { parse as parseSFC } from "@vue/compiler-sfc";
import { parse as babelParse } from "@babel/parser";
import type {
  ObjectExpression,
  ObjectMethod,
  ObjectProperty,
  SpreadElement,
  Node,
} from "@babel/types";
import {
  HierarchyNode,
  HierarchyCategory,
  ParseResult,
  LIFECYCLE_HOOKS,
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

      // Only process Options API (export default { ... })
      if (!descriptor.scriptSetup) {
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
