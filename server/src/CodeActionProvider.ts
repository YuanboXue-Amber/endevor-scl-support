import { CodeAction, CodeActionParams, DiagnosticSeverity, CodeActionKind, TextDocument } from 'vscode-languageserver';
import { isNullOrUndefined } from "util";
import { QUICKFIXMSG } from './parser/ParserTags';

/**
 * Provide quickfix only for:
 * not fully uppercased keywords
 *
 * @export
 * @param {TextDocument} textDocument
 * @param {CodeActionParams} parms
 * @returns {CodeAction[]}
 */
export function quickfix(textDocument: TextDocument, parms: CodeActionParams): CodeAction[]{
    const diagnostics = parms.context.diagnostics;
    if (isNullOrUndefined(diagnostics) || diagnostics.length === 0) {
        return [];
    }

    const codeActions: CodeAction[] = [];
    diagnostics.forEach((diag) => {
        if (diag.severity === DiagnosticSeverity.Warning && diag.message === QUICKFIXMSG) {
            codeActions.push({
                title: "Uppercase the keyword",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diag],
                edit: {
                    changes: {
                        [parms.textDocument.uri]: [{
                            range: diag.range, newText: textDocument.getText(diag.range).toUpperCase()
                        }]
                    }
                }
            });
            return;
        }
    });

    return codeActions;
}
