
import { DiagnosticSeverity, CompletionItemKind, CompletionItem } from 'vscode-languageserver';
import { ITokenizedString } from '../Tokenizer';
import { SCLstatement, SCLDocument } from '../../documents/SCLDocument';
import { ItreeNode } from './doc/Inode';
import { match } from '../ParserTags';
import { isNullOrUndefined } from 'util';
import { QUICKFIX_NO_EOS_MSG, QUICKFIX_SPACE_BEFORE_EOS_MSG } from '../../CodeActionProvider';

const VALIDSCL_NUMBER: number = Number.MAX_SAFE_INTEGER;

function setCompletionItemsForToken(token: ITokenizedString, matchedNode: ItreeNode) {
    token.completionItems = [];
    for (const child of matchedNode.children) {
        if (child.type as string === "keyword") {
            if (child.value.toUpperCase() === "EQUALSIGN")
                token.completionItems.push({
                    label: "= ",
                    kind: CompletionItemKind.Text,
                    documentation: "Endevor SCL keyword"
                });
            else
                token.completionItems.push({
                    label: child.value.toUpperCase() + " ",
                    kind: CompletionItemKind.Text,
                    documentation: "Endevor SCL keyword"
                });
        }
        else if (child.type as string === "value") {
            token.completionItems.push({
                label: child.value + " ",
                kind: CompletionItemKind.Text,
                documentation: "Endevor SCL value"
            });
        }
    }
}

function searchCompletionItemsForToken(token: ITokenizedString, matchedNode: ItreeNode, isSET?: boolean) {
    let targetNode: ItreeNode | undefined;
    token.completionItems = [];

    // 1st check if this token is envname/sysname...
    // if so, we search for FROM/TO before matchedNode, get its children as compeltion item
    if (!isNullOrUndefined(matchedNode.parent)) {
        if (matchedNode.parent.type === "keyword") {
            if (matchedNode.parent.value === "ENVIRONMENT" ||
                matchedNode.parent.value === "SYSTEM" ||
                matchedNode.parent.value === "SUBSYSTEM" ||
                matchedNode.parent.value === "TYPE" ||
                matchedNode.parent.value === "STAGE") { // STAGE 1 (matchedNode)
                // get FROM/TO's children
                if (!isNullOrUndefined(matchedNode.parent.parent)) {
                    targetNode = matchedNode.parent.parent;
                    for (const child of targetNode.children) {
                        if (child.type as string === "keyword" && child.value !== matchedNode.parent.value &&
                            (child.value === "ENVIRONMENT" || child.value === "SYSTEM" || child.value === "SUBSYSTEM" ||
                            child.value === "TYPE" || child.value === "STAGE") ) {
                            token.completionItems.push({
                                label: child.value.toUpperCase() + " ",
                                kind: CompletionItemKind.Text,
                                documentation: "Endevor SCL keyword"
                            });
                        }
                    }
                    if (isSET) return;
                }
            }
            else if (!isNullOrUndefined(matchedNode.parent.parent) && matchedNode.parent.parent.value === "STAGE") { // STAGE NUMBER 1 (matchedNode)
                // get FROM/TO's children
                if (!isNullOrUndefined(matchedNode.parent.parent.parent)) {
                    targetNode = matchedNode.parent.parent.parent;
                    for (const child of targetNode.children) {
                        if (child.type as string === "keyword" && child.value !== matchedNode.parent.parent.value &&
                            (child.value === "ENVIRONMENT" || child.value === "SYSTEM" || child.value === "SUBSYSTEM" ||
                            child.value === "TYPE" || child.value === "STAGE") ) {
                            token.completionItems.push({
                                label: child.value.toUpperCase() + " ",
                                kind: CompletionItemKind.Text,
                                documentation: "Endevor SCL keyword"
                            });
                        }
                    }
                    if (isSET) return;
                }
            }
        }
    }

    // otherwise, we search parents,
    // if we find OPTION, take its completion items
    // else if we find FROM/TO, take its parent's completion items
    while(!isNullOrUndefined(matchedNode.parent)) {
        if (matchedNode.parent.type === "keyword") {
            if (matchedNode.parent.value === "OPTION") {
                setCompletionItemsForToken(token, matchedNode.parent);
                return;
            }
            if ((matchedNode.parent.value === "FROM" || matchedNode.parent.value === "TO" ||
                 matchedNode.parent.value === "THROUGH" || matchedNode.parent.value === "THRU")
                && !isNullOrUndefined(matchedNode.parent.parent)) {
                targetNode = matchedNode.parent.parent;
                for (const child of targetNode.children) {
                    if (child.type as string === "keyword"
                        && child.value !== matchedNode.parent.value
                        && child.value !== "THROUGH" && child.value !== "THRU") {
                        token.completionItems.push({
                            label: child.value.toUpperCase() + " ",
                            kind: CompletionItemKind.Text,
                            documentation: "Endevor SCL keyword"
                        });
                    }
                }
                return;
            }
        }
        matchedNode = matchedNode.parent;
    }
}

function dealWithCompletion(token: ITokenizedString, matchedNode: ItreeNode, isSET?: boolean) {
    if (matchedNode.children.length > 0 &&
        !(matchedNode.children.length === 1 && matchedNode.children[0].type === "eos")) {
        setCompletionItemsForToken(token, matchedNode);
    } else {
        searchCompletionItemsForToken(token, matchedNode, isSET);
    }
}

export function parser(rootNode: ItreeNode, statement: SCLstatement, document: SCLDocument) {
    const currSCL: ITokenizedString[] = statement.tokens;
    setCompletionItemsForToken(currSCL[0], rootNode);
    let isSET = false;
    if (currSCL[0].value.toUpperCase() === "SET")
        isSET = true;

    let tokenIter: number = 1;
    const matchToken = ((parentNode: ItreeNode, onlyMatchKey?: boolean): number => {
        if (tokenIter >= currSCL.length) {
            return VALIDSCL_NUMBER;
        }
        const token = currSCL[tokenIter];
        for (const childNode of parentNode.children) {
            switch (true) {
                case childNode.type === "keyword" && match(token, childNode.value, statement, document):
                    tokenIter ++;
                    dealWithCompletion(token, childNode, isSET);
                    return matchToken(childNode);

                case !onlyMatchKey && (childNode.type ==="value" && !token.is_eoStatement):
                    tokenIter ++;
                    dealWithCompletion(token, childNode, isSET);
                    return matchToken(childNode);

                case !onlyMatchKey && (childNode.type === "eos" && token.is_eoStatement):
                    tokenIter ++;
                    dealWithCompletion(token, childNode, isSET);
                    return matchToken(childNode);

                default:
                    break;
            }
        }
        if (!onlyMatchKey &&
            !isNullOrUndefined(parentNode.requireNext) && parentNode.requireNext) {
            document.pushDiagnostic(
                token, statement,
                DiagnosticSeverity.Error,
                `Require a valid value to be specified`);
            return tokenIter;
        }

        if (!isNullOrUndefined(parentNode.parent)) {
            return matchToken(parentNode.parent, true);
        }
        return tokenIter;
    });
    const test = matchToken(rootNode);
    return test;
}

export function diagnose(rootNode: ItreeNode, statement: SCLstatement, document: SCLDocument) {
    processEOS(statement, document);

    const iterator = parser(rootNode, statement, document);
    if (iterator === VALIDSCL_NUMBER) {
        return;
    }
    const currSCL: ITokenizedString[] = statement.tokens;
    if (iterator-1 >= 0) {
        if (!isNullOrUndefined(currSCL[iterator-1].completionItems)) {
            const possibleValues: string[] = [];
            (currSCL[iterator-1].completionItems as CompletionItem[]).forEach((item) => {
                possibleValues.push(item.label);
            });
            if (possibleValues.length > 0) {
                document.pushDiagnostic(
                    currSCL[iterator], statement,
                    DiagnosticSeverity.Error,
                    `Invalid value specified`,
                    `Possible valid values: ${possibleValues.join(", ")}`,
                    currSCL[iterator-1]);
                return;
            }
        }
    }
    document.pushDiagnostic(
        currSCL[iterator], statement,
        DiagnosticSeverity.Error,
        `Invalid value specified`);

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