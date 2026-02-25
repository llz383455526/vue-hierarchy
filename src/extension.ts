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

  // Register the TreeView
  const treeView = vscode.window.createTreeView("vueHierarchyView", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

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
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Vue Hierarchy: Failed to navigate — ${err.message}`,
          );
        }
      },
    ),
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
      if (editor && editor.document.languageId === "vue") {
        treeProvider.refresh(editor.document);
      } else {
        treeProvider.clear();
      }
    }),
  );

  // --- Initial parse if a Vue file is already open ---
  if (
    vscode.window.activeTextEditor &&
    vscode.window.activeTextEditor.document.languageId === "vue"
  ) {
    treeProvider.refresh(vscode.window.activeTextEditor.document);
  }
}

export function deactivate() {
  // Nothing to clean up
}
