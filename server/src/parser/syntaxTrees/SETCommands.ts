import { ITokenizedString } from "../Tokenizer";
import { parseEOStatement } from "./SyntaxTreeUtils";
import { DiagnosticSeverity } from "vscode-languageserver";
import { match } from "../ParserTags";
import { SCLstatement, SCLDocument } from "../../documents/SCLDocument";

/**
 * Top syntax tree for SET
 *
 * @export
 * @param {SCLstatement} statement
 * @param {SCLDocument} document
 * @returns
 */
export function parseSETSCL(statement: SCLstatement, document: SCLDocument) {
    // currSCL[0] is SET for sure
    const currSCL: ITokenizedString[] = statement.tokens;

    if (currSCL.length < 2) {
        document.pushDiagnostic(
            currSCL[0],
            statement,
            DiagnosticSeverity.Error,
            'SET should be followed by the following keywords: ACTION, BUILD, FROM, OPTIONS, STOPRC, TO, WHERE');
        return;
    }

    let i = 1;
    let token = currSCL[i];
    switch (true) {
        case match(token, "T_ACTION", statement, document):
            parseSetAction(i, statement, document);
            return;
        case match(token, "T_BUILD", statement, document):

            break;
        case match(token, "T_FROM", statement, document):

            break;
        case match(token, "T_OPTIONS", statement, document):

            break;
        case match(token, "T_STOPRC", statement, document):

            break;
        case match(token, "T_TO", statement, document):

            break;
        case match(token, "T_WHERE", statement, document):

            break;
        default:
            document.pushDiagnostic(
                token, statement,
                DiagnosticSeverity.Error,
                `Invalid keyword \"${token.value}\" specified after SET`,
                'SET should be followed by the following keywords: ACTION, BUILD, FROM, OPTIONS, STOPRC, TO, WHERE');
            return;
    }
}

/**
 * Syntax tree for SET ACTION
 *
 * @export
 * @param {number} iterator statement.tokens[iterator+1] will be the next token we are parsing
 * @param {SCLstatement} statement
 * @param {SCLDocument} document
 * @returns
 */
export function parseSetAction(
    iterator: number,
    statement: SCLstatement, document: SCLDocument) {

    const currSCL: ITokenizedString[] = statement.tokens;
    const i = iterator+1;
    if (i < currSCL.length) {
        let token = currSCL[i];
        // 1st switch case check if action is correct
            // i++ check if there's line ending, then check if line ending is in correct pos
        switch (true) {
            case match(token, "T_ADD", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_ARCHIVE", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_COPY", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_DELETE", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_GENERATE", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_LIST", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_MOVE", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_PRINT", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_RESTORE", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_RETRIEVE", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_SIGNIN", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_TRANSFER", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_UPDATE", statement, document):
                parseEOStatement(i, statement, document);
                return;
            case match(token, "T_VALIDATE", statement, document):
                parseEOStatement(i, statement, document);
                return;
            default:
                document.pushDiagnostic(
                    token, statement,
                    DiagnosticSeverity.Error,
                    `Invalid action \"${token.value}\" specified after SET ACTION`,
                    'Valid actions are: ADD, ARCHIVE, COPY, DELETE, GENERATE, LIST, MOVE, PRINT, RESTORE, RETRIEVE, SIGNIN, TRANSFER, UPDATE, VALIDATE');
                return;
        }

    } else {
        document.pushDiagnostic(
            currSCL[iterator], statement,
            DiagnosticSeverity.Error,
            "No action specified after SET ACTION",
            'Valid actions are: ADD, ARCHIVE, COPY, DELETE, GENERATE, LIST, MOVE, PRINT, RESTORE, RETRIEVE, SIGNIN, TRANSFER, UPDATE, VALIDATE');
        return;
    }
}

