import { SyntaxDiagnose } from "../syntaxDiagnose";
import { TokenizedString } from "../tokenizer";
import { parseEOStatement } from "./syntaxTreeUtils";
import { DiagnosticSeverity } from "vscode-languageserver";
import { match } from "../parserTags";


/**
 * Syntax tree for SET ACTION
 *
 * @export
 * @param {SyntaxDiagnose} syntaxDiagnoseObj
 * @param {TokenizedString[]} currSCL
 * @param {number} iterator
 * @returns
 */
export function parseSetAction(
    syntaxDiagnoseObj: SyntaxDiagnose,
    currSCL: TokenizedString[], iterator: number) {

    const i = iterator+1;
    if (i < currSCL.length) {
        let token = currSCL[i];
        // 1st switch case check if action is correct
            // i++ check if there's line ending, then check if line ending is in correct pos
        switch (true) {
            case match(token, "T_ADD", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_ARCHIVE", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_COPY", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_DELETE", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_GENERATE", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_LIST", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_MOVE", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_PRINT", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_RESTORE", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_RETRIEVE", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_SIGNIN", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_TRANSFER", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_UPDATE", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token, "T_VALIDATE", syntaxDiagnoseObj):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            default:
                syntaxDiagnoseObj.pushDiagnostic(DiagnosticSeverity.Error, token,
                    `Invalid action \"${token.value}\" specified after SET ACTION`,
                    'Valid actions are: ADD, ARCHIVE, COPY, DELETE, GENERATE, LIST, MOVE, PRINT, RESTORE, RETRIEVE, SIGNIN, TRANSFER, UPDATE, VALIDATE');
                return;
        }

    } else {
        syntaxDiagnoseObj.pushDiagnostic(DiagnosticSeverity.Error, currSCL[iterator],
            "No action specified after SET ACTION",
            'Valid actions are: ADD, ARCHIVE, COPY, DELETE, GENERATE, LIST, MOVE, PRINT, RESTORE, RETRIEVE, SIGNIN, TRANSFER, UPDATE, VALIDATE');
        return;
    }
}

