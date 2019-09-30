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
            case match(token.value, "T_ADD"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_ARCHIVE"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_COPY"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_DELETE"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_GENERATE"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_LIST"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_MOVE"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_PRINT"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_RESTORE"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_RETRIEVE"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_SIGNIN"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_TRANSFER"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_UPDATE"):
                parseEOStatement(syntaxDiagnoseObj, currSCL, i);
                return;
            case match(token.value, "T_VALIDATE"):
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

