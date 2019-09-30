import { TokenizedString } from '../tokenizer';
import { SyntaxDiagnose } from '../syntaxDiagnose';
import { DiagnosticSeverity } from 'vscode-languageserver';

/**
 *
 *
 * @export
 * @param {SyntaxDiagnose} syntaxDiagnoseObj
 * @param {TokenizedString[]} currSCL
 * @param {number} iterator stops at the index of last PROCESSED keyword in currSCL,
 * meaning the keyword we are going to process is iterator+1, if there's any.
 * @returns
 */
export function parseEOStatement(
    syntaxDiagnoseObj: SyntaxDiagnose,
    currSCL: TokenizedString[], iterator: number) {

    const eosIndex = iterator+1;
    if (eosIndex < currSCL.length) {
        let token = currSCL[eosIndex];
        if (token.is_eoStatement) {
            if (token.startPos === currSCL[iterator].startPos + currSCL[iterator].value.length) {
                // no space between keyword/value and eof operator
                syntaxDiagnoseObj.pushDiagnostic(DiagnosticSeverity.Error, token,
                    "Invalid scl. Expecting a space before end of statement operator \".\"");
                return;
            }
            // valid scl
            return;
        } else {
            syntaxDiagnoseObj.pushDiagnostic(DiagnosticSeverity.Error, token,
                "Invalid scl. Expecting end of statement operator \".\"");
            return;
        }
    } else {
        syntaxDiagnoseObj.pushDiagnostic(DiagnosticSeverity.Error, currSCL[iterator],
            "No end of statement operator \".\" specified");
        return;
    }
}