import { CodeAction, CodeActionParams, Diagnostic, DiagnosticSeverity, CodeActionKind, TextDocument } from 'vscode-languageserver';
import { isNullOrUndefined } from "util";

export function quickfix(textDocument: TextDocument, parms: CodeActionParams): CodeAction[]{
    const diagnostics = parms.context.diagnostics;
    if (isNullOrUndefined(diagnostics) || diagnostics.length === 0) {
        return [];
    }
    const test: Diagnostic = diagnostics[0];

    const codeActions: CodeAction[] = [];
    if (test.severity === DiagnosticSeverity.Error) { // Warning &&
        // diagnostics[0].message.indexOf("owercase") >= 0) {
        codeActions.push({
            title: "Uppercase the keyword",
            kind: CodeActionKind.QuickFix,
            diagnostics: [test],
            edit: {
                changes: {
                    [parms.textDocument.uri]: [{
                        range: test.range, newText: textDocument.getText(test.range).toUpperCase()
                    }]
                }
            }
        });
    }
    return codeActions;
}
