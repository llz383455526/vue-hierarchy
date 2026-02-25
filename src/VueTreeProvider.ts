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
  ) {
    const hasChildren = (node.children?.length ?? 0) > 0;
    super(
      node.label,
      hasChildren
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
    );

    // Description shown to the right of the label
    if (node.detail) {
      this.description = node.detail;
    }

    // Tooltip
    this.tooltip = node.detail ? `${node.label}: ${node.detail}` : node.label;

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

  /**
   * Refresh the tree by re-parsing the current document.
   */
  refresh(document?: vscode.TextDocument): void {
    const doc = document || vscode.window.activeTextEditor?.document;
    if (doc && doc.languageId === "vue") {
      this.currentFilePath = doc.uri.fsPath;
      this.parseResult = parseVueFile(doc.getText(), doc.uri.fsPath);

      if (this.parseResult.warnings && this.parseResult.warnings.length > 0) {
        // Log warnings but don't bother the user
        for (const w of this.parseResult.warnings) {
          console.warn(`[Vue Hierarchy] ${w}`);
        }
      }
    } else {
      this.parseResult = null;
      this.currentFilePath = "";
    }
    this._onDidChangeTreeData.fire();
  }

  /**
   * Clear the tree (e.g. when no Vue file is active).
   */
  clear(): void {
    this.parseResult = null;
    this.currentFilePath = "";
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: VueHierarchyItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: VueHierarchyItem): Thenable<VueHierarchyItem[]> {
    if (!this.parseResult) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Root level — return categories
      return Promise.resolve(
        this.parseResult.categories.map(
          (node) => new VueHierarchyItem(node, this.currentFilePath),
        ),
      );
    }

    // Child level
    const children = element.node.children || [];
    return Promise.resolve(
      children.map(
        (child) => new VueHierarchyItem(child, this.currentFilePath),
      ),
    );
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
}
