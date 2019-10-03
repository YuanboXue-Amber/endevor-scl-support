import { CodeAction, CodeActionParams, DiagnosticSeverity, CodeActionKind, TextDocument } from 'vscode-languageserver';
import { isNullOrUndefined } from "util";

export const QUICKFIX_UPPERCASE_MSG = "Keyword should be uppercased";
export const QUICKFIX_SPACE_BEFORE_EOS_MSG = "Invalid scl. Expecting a space before end of statement operator \".\"";
export const QUICKFIX_NO_EOS_MSG = "Invalid scl. No end of statement operator \".\" specified";

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
        if (diag.severity === DiagnosticSeverity.Warning && diag.message === QUICKFIX_UPPERCASE_MSG) {
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

        if (diag.severity === DiagnosticSeverity.Error && diag.message === QUICKFIX_SPACE_BEFORE_EOS_MSG) {
            codeActions.push({
                title: "Adding space between value and end of statement operator",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diag],
                edit: {
                    changes: {
                        [parms.textDocument.uri]: [{
                            range: diag.range, newText: " " + textDocument.getText(diag.range)
                        }]
                    }
                }
            });
            return;
        }

        if (diag.severity === DiagnosticSeverity.Error && diag.message === QUICKFIX_NO_EOS_MSG) {
            codeActions.push({
                title: "Adding end of statement operator",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diag],
                edit: {
                    changes: {
                        [parms.textDocument.uri]: [{
                            range: diag.range, newText: textDocument.getText(diag.range) + " . "
                        }]
                    }
                }
            });
            return;
        }
    });

    return codeActions;
}
