import { ITokenizedString } from "../Tokenizer";
import { parseEOStatement, ALL_COMPLETION_ITEMS } from "./SyntaxTreeUtils";
import { DiagnosticSeverity } from 'vscode-languageserver';
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
    const completionItems = ["ACTION", "BUILD", "FROM", "OPTIONS", "STOPRC", "TO", "WHERE"];
    currSCL[0].completionItemsKey = "SET";
    ALL_COMPLETION_ITEMS.set(currSCL[0].completionItemsKey as string, completionItems);

    if (currSCL.length < 2) {
        document.pushDiagnostic(
            currSCL[0],
            statement,
            DiagnosticSeverity.Error,
            "Incomplete SCL.");
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
                `Invalid keyword \"${token.value}\" specified after SET.` +
                    `\nValid keywords: ${completionItems.join(", ")}`);
            return;
    }
}

/**
 * Syntax tree for SET ACTION
 *
 * @param {number} iterator statement.tokens[iterator+1] will be the next token we are parsing
 * @param {SCLstatement} statement
 * @param {SCLDocument} document
 * @returns
 */
function parseSetAction(
    iterator: number,
    statement: SCLstatement, document: SCLDocument) {

    const currSCL: ITokenizedString[] = statement.tokens;
    // currSCL[iterator] is ACTION
    const completionItems = [
        "ADD", "ARCHIVE", "COPY", "DELETE", "GENERATE", "LIST", "MOVE", "PRINT", "RESTORE", "RETRIEVE", "SIGNIN", "TRANSFER", "UPDATE", "VALIDATE"];
    currSCL[iterator].completionItemsKey = "SET ACTION";
    ALL_COMPLETION_ITEMS.set(currSCL[iterator].completionItemsKey as string, completionItems);

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
                    `Invalid keyword \"${token.value}\" specified after SET ACTION.` +
                        `\nValid keywords: ${completionItems.join(", ")}`);
                return;
        }

    } else {
        document.pushDiagnostic(
            currSCL[iterator], statement,
            DiagnosticSeverity.Error,
            "Incomplete SCL.");
        return;
    }
}

