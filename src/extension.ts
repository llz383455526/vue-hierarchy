import * as vscode from "vscode";
import { VueTreeProvider } from "./VueTreeProvider";

/** Debounce helper */
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: any[]) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn(...args), delay);
  }) as unknown as T;
}

export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new VueTreeProvider();
  treeProvider.setContext(context);

  // Register the TreeView (with getParent for reveal support)
  const treeView = vscode.window.createTreeView("vueHierarchyView", {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(treeView);

  // --- Cursor sync: track whether reveal was triggered by us (to avoid loops) ---
  let isRevealingFromCursor = false;
  let isNavigatingFromTree = false;

  // --- Commands ---

  // Manual refresh
  context.subscriptions.push(
    vscode.commands.registerCommand("vueHierarchy.refresh", () => {
      treeProvider.refresh();
    }),
  );

  // Go to line command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vueHierarchy.gotoLine",
      async (filePath: string, line: number, column: number) => {
        try {
          // Mark that this navigation came from the tree (avoid cursor sync loop)
          isNavigatingFromTree = true;

          const uri = vscode.Uri.file(filePath);
          const doc = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(doc, {
            preserveFocus: false,
          });

          const position = new vscode.Position(line, column);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenterIfOutsideViewport,
          );

          // Reset the flag after a short delay
          setTimeout(() => { isNavigatingFromTree = false; }, 100);
        } catch (err: any) {
          isNavigatingFromTree = false;
          vscode.window.showErrorMessage(
            `Vue Hierarchy: Failed to navigate — ${err.message}`,
          );
        }
      },
    ),
  );

  // Go to reference command (right-click context menu)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vueHierarchy.gotoRef",
      async (item: any) => {
        // item is a VueHierarchyItem passed from the context menu
        if (!item || !item.node) { return; }
        const node = item.node;
        const refs = node.refs;
        if (!refs || refs.length === 0) {
          vscode.window.showInformationMessage(
            `"${node.label}" has no template references.`,
          );
          return;
        }

        const filePath = item.filePath;

        if (refs.length === 1) {
          // Single ref — jump directly
          const ref = refs[0];
          await jumpToLine(filePath, ref.line, 0);
        } else {
          // Multiple refs — show QuickPick
          interface RefPickItem extends vscode.QuickPickItem {
            refLine: number;
          }
          const picks: RefPickItem[] = refs.map((r: any) => ({
            label: `L${r.line + 1}`,
            description: r.context,
            detail: `${r.type}`,
            refLine: r.line,
          }));
          const selected = await vscode.window.showQuickPick(picks, {
            placeHolder: `"${node.label}" — select a reference to jump to`,
          });
          if (selected) {
            await jumpToLine(filePath, selected.refLine, 0);
          }
        }
      },
    ),
  );

  // Helper: jump to a specific line in a file
  async function jumpToLine(filePath: string, line: number, column: number) {
    try {
      isNavigatingFromTree = true;
      const uri = vscode.Uri.file(filePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, {
        preserveFocus: false,
      });
      const position = new vscode.Position(line, column);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
      );
      setTimeout(() => { isNavigatingFromTree = false; }, 100);
    } catch (err: any) {
      isNavigatingFromTree = false;
    }
  }

  // --- Filter Categories command ---
  context.subscriptions.push(
    vscode.commands.registerCommand("vueHierarchy.filterCategories", async () => {
      const categories = treeProvider.getAvailableCategories();
      if (categories.length === 0) {
        vscode.window.showInformationMessage("No categories available.");
        return;
      }

      const isActive = treeProvider.isFilterActive();
      const activeSet = treeProvider.getActiveFilterSet();

      const items: vscode.QuickPickItem[] = categories.map((cat) => ({
        label: cat,
        picked: isActive ? activeSet.has(cat) : true,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: "Select categories to display (deselect to hide)",
      });

      if (!selected) { return; } // cancelled

      if (selected.length === categories.length) {
        treeProvider.setFilter(null);
      } else {
        treeProvider.setFilter(selected.map((s) => s.label));
      }
    }),
  );

  // --- Go to Member command ---
  context.subscriptions.push(
    vscode.commands.registerCommand("vueHierarchy.gotoMember", async () => {
      const members = treeProvider.getAllMembers();
      if (members.length === 0) {
        vscode.window.showInformationMessage("No members found in current file.");
        return;
      }

      interface MemberPickItem extends vscode.QuickPickItem {
        memberLine: number;
        memberColumn: number;
      }
      const picks: MemberPickItem[] = members.map((m) => ({
        label: m.label,
        description: m.category,
        memberLine: m.line,
        memberColumn: m.column,
      }));

      const selected = await vscode.window.showQuickPick(picks, {
        placeHolder: "Type to search members...",
        matchOnDescription: true,
      });

      if (!selected) { return; }

      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await jumpToLine(editor.document.uri.fsPath, selected.memberLine, selected.memberColumn);
        // Also reveal in tree
        const item = treeProvider.findItemAtLine(selected.memberLine);
        if (item) {
          isRevealingFromCursor = true;
          treeView.reveal(item, { select: true, focus: false, expand: true }).then(
            () => { isRevealingFromCursor = false; },
            () => { isRevealingFromCursor = false; },
          );
        }
      }
    }),
  );

  // --- Toggle Expand/Collapse All command ---
  context.subscriptions.push(
    vscode.commands.registerCommand("vueHierarchy.toggleCollapse", () => {
      const allCollapsed = treeProvider.isAllCollapsed();
      treeProvider.setCollapseAll(!allCollapsed);
    }),
  );

  // --- Focus Category command ---
  context.subscriptions.push(
    vscode.commands.registerCommand("vueHierarchy.focusCategory", async () => {
      const categories = treeProvider.getAvailableCategories();
      if (categories.length === 0) {
        vscode.window.showInformationMessage("No categories available.");
        return;
      }

      const selected = await vscode.window.showQuickPick(
        categories.map((cat) => ({ label: cat })),
        { placeHolder: "Select a category to focus (others will collapse)" },
      );

      if (selected) {
        treeProvider.focusCategory(selected.label);
      }
    }),
  );

  // --- Track collapse/expand events for state persistence ---
  context.subscriptions.push(
    treeView.onDidCollapseElement((e) => {
      treeProvider.setCollapseForCategory(e.element.node.label, true);
    }),
  );
  context.subscriptions.push(
    treeView.onDidExpandElement((e) => {
      treeProvider.setCollapseForCategory(e.element.node.label, false);
    }),
  );

  // --- Auto-refresh on document change (debounced) ---
  const debouncedRefresh = debounce((doc: vscode.TextDocument) => {
    treeProvider.refresh(doc);
  }, 300);

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === "vue") {
        debouncedRefresh(e.document);
      }
    }),
  );

  // --- Auto-refresh on active editor change ---
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && (editor.document.languageId === "vue" || editor.document.fileName.endsWith(".vue"))) {
        treeProvider.refresh(editor.document);
      } else {
        treeProvider.clear();
      }
    }),
  );

  // --- Cursor sync: reveal tree item when cursor moves (debounced) ---
  const debouncedCursorSync = debounce((editor: vscode.TextEditor) => {
    // Skip if tree view is not visible or navigation came from tree click
    if (!treeView.visible || isNavigatingFromTree) {
      return;
    }

    const doc = editor.document;
    if (doc.languageId !== "vue" && !doc.fileName.endsWith(".vue")) {
      return;
    }

    const cursorLine = editor.selection.active.line; // 0-based
    const item = treeProvider.findItemAtLine(cursorLine);
    if (!item) {
      return;
    }

    // Reveal the matched item in the tree, selecting and focusing it
    isRevealingFromCursor = true;
    treeView.reveal(item, { select: true, focus: false, expand: false }).then(
      () => { isRevealingFromCursor = false; },
      () => { isRevealingFromCursor = false; },
    );
  }, 150);

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (isRevealingFromCursor) {
        return; // avoid feedback loop
      }
      debouncedCursorSync(e.textEditor);
    }),
  );

  // --- Initial parse if a Vue file is already open ---
  if (
    vscode.window.activeTextEditor &&
    (vscode.window.activeTextEditor.document.languageId === "vue" ||
     vscode.window.activeTextEditor.document.fileName.endsWith(".vue"))
  ) {
    treeProvider.refresh(vscode.window.activeTextEditor.document);
  }
}

export function deactivate() {
  // Nothing to clean up
}