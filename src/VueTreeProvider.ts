import * as vscode from "vscode";
import { HierarchyNode, ParseResult } from "./types";
import { parseVueFile } from "./VueFileParser";

/**
 * Tree item wrapping a HierarchyNode for display in VSCode's TreeView.
 */
export class VueHierarchyItem extends vscode.TreeItem {
  constructor(
    public readonly node: HierarchyNode,
    public readonly filePath: string,
    isCollapsed?: boolean,
    generation?: number,
  ) {
    const hasChildren = (node.children?.length ?? 0) > 0;
    super(
      node.label,
      hasChildren
        ? (isCollapsed
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.Expanded)
        : vscode.TreeItemCollapsibleState.None,
    );

    // Use a generation-stamped id so VS Code treats state changes as fresh nodes
    this.id = generation != null
      ? `${node.category}::${node.label}::${generation}`
      : `${node.category}::${node.label}`;

    // --- Build description ---
    let desc = node.detail || "";

    // For method nodes: show event bindings
    if (node.eventBindings && node.eventBindings.length > 0) {
      const bindingStr = node.eventBindings
        .map((b) => `@${b.event} (L${b.line + 1})`)
        .join(", ");
      const prefix = `← ${bindingStr}`;
      desc = desc ? `${desc}  ${prefix}` : prefix;
    }

    // For method nodes: show calledBy
    if (node.calledBy && node.calledBy.length > 0) {
      const calledByStr = `← ${node.calledBy.join(", ")}`;
      desc = desc ? `${desc}  ${calledByStr}` : calledByStr;
    }

    if (desc) {
      this.description = desc;
    }

    // --- Build tooltip ---
    const tooltipParts: string[] = [];
    tooltipParts.push(node.detail ? `${node.label}: ${node.detail}` : node.label);

    // Ref locations
    if (node.refs && node.refs.length > 0) {
      const refDetails = node.refs
        .map((r) => `L${r.line + 1} ${r.context}`)
        .join(", ");
      tooltipParts.push(`引用: ${refDetails}`);
    }

    // Method calls
    if (node.calls && node.calls.length > 0) {
      tooltipParts.push(`调用: ${node.calls.map((c) => `${c}()`).join(", ")}`);
    }

    // Called by
    if (node.calledBy && node.calledBy.length > 0) {
      tooltipParts.push(`被调用: ${node.calledBy.join(", ")}`);
    }

    // Event bindings (in tooltip too)
    if (node.eventBindings && node.eventBindings.length > 0) {
      const bindStr = node.eventBindings
        .map((b) => `@${b.event} (L${b.line + 1})`)
        .join(", ");
      tooltipParts.push(`事件绑定: ${bindStr}`);
    }

    this.tooltip = new vscode.MarkdownString(tooltipParts.join("  \n"));

    // Icon
    if (node.icon) {
      this.iconPath = new vscode.ThemeIcon(node.icon);
    }

    // Click command — jump to the line
    this.command = {
      command: "vueHierarchy.gotoLine",
      title: "Go to Line",
      arguments: [filePath, node.line, node.column],
    };

    // Context value for potential context menu contributions
    this.contextValue = node.category;
  }
}

/**
 * TreeDataProvider that drives the Vue Hierarchy sidebar view.
 */
export class VueTreeProvider implements vscode.TreeDataProvider<VueHierarchyItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    VueHierarchyItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private parseResult: ParseResult | null = null;
  private currentFilePath: string = "";
  private outputChannel: vscode.OutputChannel;

  /**
   * Cached tree items for cursor sync (reveal requires same object references).
   */
  private cachedRootItems: VueHierarchyItem[] = [];
  private cachedChildItems: Map<VueHierarchyItem, VueHierarchyItem[]> = new Map();

  /**
   * Flat list of all visible tree items sorted by line number,
   * used for efficient cursor-to-node lookup.
   */
  private flatItemsByLine: VueHierarchyItem[] = [];

  /**
   * Active category filter. null = show all.
   */
  private activeFilter: Set<string> | null = null;

  /**
   * Collapse state storage: filePath → (categoryLabel → isCollapsed)
   */
  private collapseState: Map<string, Map<string, boolean>> = new Map();

  /**
   * VS Code extension context for workspaceState persistence.
   */
  private extensionContext: vscode.ExtensionContext | null = null;

  /**
   * Generation counter — incremented on explicit toggle to force VS Code
   * to treat tree items as new nodes and respect our collapsibleState.
   */
  private generation: number = 0;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Vue Hierarchy");
  }

  /**
   * Initialize with extension context for persistent storage.
   */
  setContext(context: vscode.ExtensionContext): void {
    this.extensionContext = context;
    this.loadCollapseState();
  }

  /**
   * Refresh the tree by re-parsing the current document.
   */
  refresh(document?: vscode.TextDocument): void {
    const doc = document || vscode.window.activeTextEditor?.document;
    if (doc && (doc.languageId === "vue" || doc.fileName.endsWith(".vue"))) {
      const newPath = doc.uri.fsPath;
      // Reset filter when switching to a different file
      if (newPath !== this.currentFilePath) {
        this.activeFilter = null;
      }
      this.currentFilePath = newPath;
      this.parseResult = parseVueFile(doc.getText(), doc.uri.fsPath);

      if (this.parseResult.warnings && this.parseResult.warnings.length > 0) {
        for (const w of this.parseResult.warnings) {
          this.outputChannel.appendLine(`[Vue Hierarchy] Warning: ${w}`);
        }
      }

      // Rebuild cached items for cursor sync
      this.rebuildCache();
    } else {
      this.parseResult = null;
      this.currentFilePath = "";
      this.clearCache();
    }
    this._onDidChangeTreeData.fire();
  }

  /**
   * Rebuild the cached tree item structure after a parse.
   * Applies active filter and collapse state.
   */
  private rebuildCache(): void {
    this.cachedRootItems = [];
    this.cachedChildItems.clear();
    this.flatItemsByLine = [];

    if (!this.parseResult) {
      return;
    }

    const fileCollapseMap = this.collapseState.get(this.currentFilePath);

    for (const node of this.parseResult.categories) {
      // Apply category filter
      if (this.activeFilter && !this.activeFilter.has(node.label)) {
        continue;
      }

      // Apply collapse state
      const isCollapsed = fileCollapseMap?.get(node.label) ?? false;
      const rootItem = new VueHierarchyItem(node, this.currentFilePath, isCollapsed, this.generation);
      this.cachedRootItems.push(rootItem);
      this.flatItemsByLine.push(rootItem);

      this.buildChildCache(rootItem, node.children);
    }

    // Sort by line number for binary search
    this.flatItemsByLine.sort((a, b) => a.node.line - b.node.line);
  }

  /**
   * Recursively build child cache for arbitrary nesting depth.
   */
  private buildChildCache(parentItem: VueHierarchyItem, children?: HierarchyNode[]): void {
    if (!children || children.length === 0) { return; }

    const childItems = children.map(
      (child) => new VueHierarchyItem(child, this.currentFilePath, undefined, this.generation),
    );
    this.cachedChildItems.set(parentItem, childItems);
    this.flatItemsByLine.push(...childItems);

    // Recurse into grandchildren
    for (const childItem of childItems) {
      this.buildChildCache(childItem, childItem.node.children);
    }
  }

  /**
   * Clear the cached items.
   */
  private clearCache(): void {
    this.cachedRootItems = [];
    this.cachedChildItems.clear();
    this.flatItemsByLine = [];
  }

  /**
   * Clear the tree (e.g. when no Vue file is active).
   */
  clear(): void {
    this.parseResult = null;
    this.currentFilePath = "";
    this.clearCache();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Find the best matching tree item for a given cursor line (0-based).
   * Returns the leaf item whose line is closest to (but not after) the cursor.
   */
  findItemAtLine(line: number): VueHierarchyItem | null {
    if (this.flatItemsByLine.length === 0) {
      return null;
    }

    // Binary search: find the last item whose line <= cursor line
    let lo = 0;
    let hi = this.flatItemsByLine.length - 1;
    let best: VueHierarchyItem | null = null;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const item = this.flatItemsByLine[mid];
      if (item.node.line <= line) {
        best = item;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return best;
  }

  /**
   * Get the parent item for a given child item (needed for TreeView.reveal).
   */
  getParent(element: VueHierarchyItem): VueHierarchyItem | null {
    for (const [root, children] of this.cachedChildItems.entries()) {
      if (children.includes(element)) {
        return root;
      }
    }
    return null;
  }

  getTreeItem(element: VueHierarchyItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: VueHierarchyItem): Thenable<VueHierarchyItem[]> {
    if (!element) {
      // Root level — return cached root items
      return Promise.resolve(this.cachedRootItems);
    }

    // Child level — return cached children
    return Promise.resolve(this.cachedChildItems.get(element) || []);
  }

  /**
   * Resolve (provide tooltip/details) for tree items, if needed.
   */
  resolveTreeItem(
    item: vscode.TreeItem,
    _element: VueHierarchyItem,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.TreeItem> {
    return item;
  }

  // ============================================================
  //  Category Filter
  // ============================================================

  /**
   * Get all available category labels from the current parse result.
   */
  getAvailableCategories(): string[] {
    if (!this.parseResult) { return []; }
    return this.parseResult.categories.map((c) => c.label);
  }

  /**
   * Set the active category filter. Pass null to show all.
   */
  setFilter(categories: string[] | null): void {
    this.activeFilter = categories ? new Set(categories) : null;
    this.rebuildCache();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Check if a filter is currently active.
   */
  isFilterActive(): boolean {
    return this.activeFilter !== null;
  }

  /**
   * Get the current active filter set (for reflecting state in QuickPick).
   */
  getActiveFilterSet(): Set<string> {
    return this.activeFilter ?? new Set();
  }

  // ============================================================
  //  Quick Jump — member listing
  // ============================================================

  /**
   * Get all member (leaf) nodes across all categories for quick-jump.
   */
  getAllMembers(): { label: string; category: string; line: number; column: number }[] {
    if (!this.parseResult) { return []; }
    const members: { label: string; category: string; line: number; column: number }[] = [];
    for (const cat of this.parseResult.categories) {
      if (cat.children) {
        for (const child of cat.children) {
          members.push({
            label: child.label,
            category: cat.label,
            line: child.line,
            column: child.column,
          });
        }
      }
    }
    return members;
  }

  // ============================================================
  //  Collapse State Management
  // ============================================================

  /**
   * Record that a category was collapsed or expanded by the user.
   */
  setCollapseForCategory(categoryLabel: string, isCollapsed: boolean): void {
    if (!this.currentFilePath) { return; }
    if (!this.collapseState.has(this.currentFilePath)) {
      this.collapseState.set(this.currentFilePath, new Map());
    }
    this.collapseState.get(this.currentFilePath)!.set(categoryLabel, isCollapsed);
    this.saveCollapseState();
  }

  /**
   * Check if all root categories are currently collapsed.
   */
  isAllCollapsed(): boolean {
    if (!this.currentFilePath || this.cachedRootItems.length === 0) { return false; }
    const fileMap = this.collapseState.get(this.currentFilePath);
    if (!fileMap) { return false; }
    // Consider all collapsed if every root item with children is collapsed
    for (const item of this.cachedRootItems) {
      if ((item.node.children?.length ?? 0) > 0) {
        if (!fileMap.get(item.node.label)) { return false; }
      }
    }
    return true;
  }

  /**
   * Set all categories to collapsed or expanded.
   */
  setCollapseAll(isCollapsed: boolean): void {
    if (!this.currentFilePath || !this.parseResult) { return; }
    const map = new Map<string, boolean>();
    for (const cat of this.parseResult.categories) {
      map.set(cat.label, isCollapsed);
    }
    this.collapseState.set(this.currentFilePath, map);
    this.saveCollapseState();
    // Bump generation so VS Code treats items as new and respects collapsibleState
    this.generation++;
    this.rebuildCache();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Focus on a single category: expand it, collapse all others.
   */
  focusCategory(categoryLabel: string): void {
    if (!this.currentFilePath || !this.parseResult) { return; }
    const map = new Map<string, boolean>();
    for (const cat of this.parseResult.categories) {
      map.set(cat.label, cat.label !== categoryLabel);
    }
    this.collapseState.set(this.currentFilePath, map);
    this.saveCollapseState();
    // Bump generation so VS Code treats items as new and respects collapsibleState
    this.generation++;
    this.rebuildCache();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Save collapse state to workspaceState for persistence.
   */
  private saveCollapseState(): void {
    if (!this.extensionContext) { return; }
    // Convert Map to serializable object
    const obj: Record<string, Record<string, boolean>> = {};
    for (const [filePath, catMap] of this.collapseState) {
      obj[filePath] = Object.fromEntries(catMap);
    }
    this.extensionContext.workspaceState.update("vueHierarchy.collapseState", obj);
  }

  /**
   * Load collapse state from workspaceState.
   */
  private loadCollapseState(): void {
    if (!this.extensionContext) { return; }
    const obj = this.extensionContext.workspaceState.get<
      Record<string, Record<string, boolean>>
    >("vueHierarchy.collapseState");
    if (!obj) { return; }
    this.collapseState.clear();
    for (const [filePath, catObj] of Object.entries(obj)) {
      this.collapseState.set(filePath, new Map(Object.entries(catObj)));
    }
  }
}
