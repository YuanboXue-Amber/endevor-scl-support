import { ITokenizedString } from '../Tokenizer';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { SCLstatement, SCLDocument } from '../../documents/SCLDocument';
import { QUICKFIX_SPACE_BEFORE_EOS_MSG, QUICKFIX_NO_EOS_MSG } from '../../codeActionProvider';

export let ALL_COMPLETION_ITEMS: Map<string, string[]> = new Map();

/**
 * Parse the end of statement character. End of all syntax tree
 *
 * @export
 * @param {number} iterator statement.tokens[iterator+1] will be the next token we are parsing
 * @param {SCLstatement} statement
 * @param {SCLDocument} document
 * @returns
 */
export function parseEOStatement(
    iterator: number, statement: SCLstatement, document: SCLDocument) {

    const currSCL: ITokenizedString[] = statement.tokens;

    const eosIndex = iterator+1;
    if (eosIndex < currSCL.length) {
        let token = currSCL[eosIndex];
        if (token.is_eoStatement) {
            if (token.starti === currSCL[iterator].starti + currSCL[iterator].value.length) {
                // no space between keyword/value and eof operator
                document.pushDiagnostic(
                    token, statement,
                    DiagnosticSeverity.Error,
                    QUICKFIX_SPACE_BEFORE_EOS_MSG);
                return;
            }
            // valid scl
            return;
        } else {
            document.pushDiagnostic(
                token, statement,
                DiagnosticSeverity.Error,
                QUICKFIX_NO_EOS_MSG);
            return;
        }
    } else {
        document.pushDiagnostic(
            currSCL[iterator], statement,
            DiagnosticSeverity.Error,
            QUICKFIX_NO_EOS_MSG);
        return;
    }
}