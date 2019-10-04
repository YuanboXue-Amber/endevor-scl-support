
import { DiagnosticSeverity } from 'vscode-languageserver';
import { ITokenizedString } from '../Tokenizer';
import { SCLstatement, SCLDocument } from '../../documents/SCLDocument';
import { Inode } from './doc/Inode';
import { match } from '../ParserTags';
import { isNullOrUndefined } from 'util';
import { QUICKFIX_NO_EOS_MSG, QUICKFIX_SPACE_BEFORE_EOS_MSG } from '../../CodeActionProvider';


function setCompletionItemsForToken(token: ITokenizedString, matchedNode: Inode) {
    token.completionItems = [];
    for (const child of matchedNode.next) {
        if (child.type as string === "keyword") {
            token.completionItems.push(child.value);
        }
    }
}

const VALIDSCL_NUMBER: number = Number.MAX_SAFE_INTEGER;
export function parser(parentNode: Inode, iterator: number, statement: SCLstatement, document: SCLDocument): number {
    const currSCL: ITokenizedString[] = statement.tokens;
    setCompletionItemsForToken(currSCL[iterator], parentNode);
    iterator ++;
    if (iterator >= currSCL.length) {
        // if (currSCL[iterator-1].is_eoStatement)
        //     return VALIDSCL_NUMBER;
        // return iterator-1;
        return VALIDSCL_NUMBER;
    }
    for (const childNode of parentNode.next) {
        if (iterator === VALIDSCL_NUMBER) {
            return VALIDSCL_NUMBER;
        }
        const childToken = currSCL[iterator];
        switch (true) {
            case childNode.type === "keyword" && match(childToken, childNode.value, statement, document):
                iterator = parser(childNode, iterator, statement, document);
                break;

            case childNode.type ==="value" && !childToken.is_eoStatement:
                iterator = parser(childNode, iterator, statement, document);
                break;

            case childNode.type === "eos" && childToken.is_eoStatement:
                iterator = parser(childNode, iterator, statement, document);
                break;

            default:
                break;
        }
    }
    return iterator;
}

export function diagnose(iterator: number, statement: SCLstatement, document: SCLDocument) {
    processEOS(statement, document);
    if (iterator === VALIDSCL_NUMBER) {
        return;
    }
    const currSCL: ITokenizedString[] = statement.tokens;
    if (iterator-1 >= 0 &&
        !isNullOrUndefined(currSCL[iterator-1].completionItems) && (currSCL[iterator-1].completionItems as string[]).length > 0) {
        document.pushDiagnostic(
            currSCL[iterator], statement,
            DiagnosticSeverity.Error,
            `Invalid value specified`,
            `Possible valid values: ${(currSCL[iterator-1].completionItems as string[]).join(", ")}`,
            currSCL[iterator-1]);
    } else {
        document.pushDiagnostic(
            currSCL[iterator], statement,
            DiagnosticSeverity.Error,
            `Invalid value specified`);
    }
}

function processEOS(statement: SCLstatement, document: SCLDocument) {
    const currSCL: ITokenizedString[] = statement.tokens;
    const lastToken = currSCL[currSCL.length-1];
    const secondLastToken = currSCL[currSCL.length-2];

    if (!lastToken.is_eoStatement) {
        document.pushDiagnostic(
            lastToken, statement,
            DiagnosticSeverity.Error,
            QUICKFIX_NO_EOS_MSG);
        return false;
    }
    if (lastToken.starti === secondLastToken.starti + secondLastToken.value.length) {
        document.pushDiagnostic(
            lastToken, statement,
            DiagnosticSeverity.Error,
            QUICKFIX_SPACE_BEFORE_EOS_MSG);
        return false;
    }
    return true;
}
