
import { DiagnosticSeverity, CompletionItemKind, CompletionItem, Diagnostic } from 'vscode-languageserver';
import { ITokenizedString } from '../Tokenizer';
import { SCLstatement, SCLDocument } from '../../documents/SCLDocument';
import { ItreeNode, IFromTocheck } from './doc/Inode';
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
                 matchedNode.parent.value === "THROUGH" ||
                 matchedNode.parent.value === "WHERE" )
                && !isNullOrUndefined(matchedNode.parent.parent)) {
                targetNode = matchedNode.parent.parent;
                for (const child of targetNode.children) {
                    if (child.type as string === "keyword") {
                        if (child.value !== matchedNode.parent.value
                            && child.value !== "THROUGH") {
                            token.completionItems.push({
                                label: child.value.toUpperCase() + " ",
                                kind: CompletionItemKind.Text,
                                documentation: "Endevor SCL keyword"
                            });
                        } else if (child.value === "WHERE") {
                            token.completionItems.push({
                                label: child.value.toUpperCase() + " ",
                                kind: CompletionItemKind.Text,
                                documentation: "Endevor SCL keyword"
                            });
                        }
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

function dealWithSETMacro(matchedNode: ItreeNode,
    statement: SCLstatement, document: SCLDocument,
    isSET?: boolean, isfrom?: boolean, isto?: boolean) {

    if (matchedNode.type === "value") {
        if (!isNullOrUndefined(matchedNode.parent)) {
            if (matchedNode.parent.value === "FILE" ||
                matchedNode.parent.value === "DDNAME" ||
                matchedNode.parent.value === "DSNAME") {
                if (isSET) {
                    if (isfrom)
                        document.setCheck.from.FILE = true;
                    if (isto)
                        document.setCheck.to.FILE = true;
                } else {
                    if (isfrom)
                        statement.fromtoCheck.from.FILE = true;
                    if (isto)
                        statement.fromtoCheck.to.FILE = true;
                }

            } else if (matchedNode.parent.value === "PATH" && !isSET) {
                if (isfrom)
                    statement.fromtoCheck.from.FILE = true;
                if (isto)
                    statement.fromtoCheck.to.FILE = true;
            }
            else if (matchedNode.parent.value === "ENVIRONMENT") {
                if (isSET) {
                    if (isfrom)
                        document.setCheck.from.location.ENVIRONMENT = true;
                    if (isto)
                        document.setCheck.to.location.ENVIRONMENT = true;
                } else {
                    if (isfrom)
                        statement.fromtoCheck.from.location.ENVIRONMENT = true;
                    if (isto)
                        statement.fromtoCheck.to.location.ENVIRONMENT = true;
                }

            } else if (matchedNode.parent.value === "SYSTEM") {
                if (isSET) {
                    if (isfrom)
                        document.setCheck.from.location.SYSTEM = true;
                    if (isto)
                        document.setCheck.to.location.SYSTEM = true;
                } else {
                    if (isfrom)
                        statement.fromtoCheck.from.location.SYSTEM = true;
                    if (isto)
                        statement.fromtoCheck.to.location.SYSTEM = true;
                }

            } else if (matchedNode.parent.value === "SUBSYSTEM") {
                if (isSET) {
                    if (isfrom)
                        document.setCheck.from.location.SUBSYSTEM = true;
                    if (isto)
                        document.setCheck.to.location.SUBSYSTEM = true;
                } else {
                    if (isfrom)
                        statement.fromtoCheck.from.location.SUBSYSTEM = true;
                    if (isto)
                        statement.fromtoCheck.to.location.SUBSYSTEM = true;
                }

            } else if (matchedNode.parent.value === "TYPE") {
                if (isSET) {
                    if (isfrom)
                        document.setCheck.from.location.TYPE = true;
                    if (isto)
                        document.setCheck.to.location.TYPE = true;
                } else {
                    if (isfrom)
                        statement.fromtoCheck.from.location.TYPE = true;
                    if (isto)
                        statement.fromtoCheck.to.location.TYPE = true;
                }

            } else if (matchedNode.parent.value === "STAGE" || matchedNode.parent.value === "NUMBER") {
                if (isSET) {
                    if (isfrom)
                        document.setCheck.from.location.STAGE = true;
                    if (isto)
                        document.setCheck.to.location.STAGE = true;
                } else {
                    if (isfrom)
                        statement.fromtoCheck.from.location.STAGE = true;
                    if (isto)
                        statement.fromtoCheck.to.location.STAGE = true;
                }

            }
        }
    }
}

function dealWithValue(matchedNode: ItreeNode, tokenIter: number, statement: SCLstatement, document: SCLDocument): (number | boolean)[] {
    const currSCL: ITokenizedString[] = statement.tokens;
    let token = currSCL[tokenIter];

    if (matchedNode.value === "'where ccid'" || matchedNode.value === "'WHERECOB'") {
        if (token.value.startsWith("(")) { // multiple ccids/procgrps ... values
            const startIter = tokenIter;

            while (!token.value.endsWith(")")) {
                // 1st check length
                if (!isNullOrUndefined(matchedNode.maxLen)) {
                    let tokenLen = token.value.length;
                    if (token.value.match(/(['"])(.*)(['"])/)) {
                        tokenLen = tokenLen-2; // strip quotes
                    }
                    if (tokenLen > matchedNode.maxLen) {
                        document.pushDiagnostic(
                            token, statement,
                            DiagnosticSeverity.Error,
                            `Length of the value should be within ${matchedNode.maxLen}`);
                    }
                }

                // 2nd check completion items
                token.completionItems = [];

                if (!token.value.endsWith(",")) { // this token is probably a real value
                    (token.completionItems as CompletionItem[]).push({
                        label: ", ",
                        kind: CompletionItemKind.Text,
                        documentation: "Endevor SCL operator"
                    });
                    (token.completionItems as CompletionItem[]).push({
                        label: ") ",
                        kind: CompletionItemKind.Text,
                        documentation: "Endevor SCL operator"
                    });

                } else { // this token is probably an operator
                    (token.completionItems as CompletionItem[]).push({
                        label: matchedNode.value,
                        kind: CompletionItemKind.Text,
                        documentation: "Endevor SCL value"
                    });
                }

                tokenIter ++;
                if (token.is_eoStatement) { // err
                    return [tokenIter, false];
                }
                if (tokenIter >= currSCL.length) { // err
                    return [startIter, false];
                }
                token = currSCL[tokenIter];
            }
            return [tokenIter, true]; // token that end with ")"

        }
    }

    // a normal single value, check its length
    if (!isNullOrUndefined(matchedNode.maxLen)) {
        let tokenLen = token.value.length;
        if (token.value.match(/(['"])(.*)(['"])/)) {
            tokenLen = tokenLen-2; // strip quotes
        }
        if (tokenLen > matchedNode.maxLen) {
            document.pushDiagnostic(
                token, statement,
                DiagnosticSeverity.Error,
                `Length of the value should be within ${matchedNode.maxLen}`);
        }
    }
    return [tokenIter, true];
}

export function parser(rootNode: ItreeNode, statement: SCLstatement, document: SCLDocument) {
    const currSCL: ITokenizedString[] = statement.tokens;
    setCompletionItemsForToken(currSCL[0], rootNode);
    let isSET = false;
    if (currSCL[0].value.toUpperCase() === "SET")
        isSET = true;
    let isfrom = false;
    let isto = false;

    let tokenIter: number = 1;
    const matchToken = ((parentNode: ItreeNode, onlyMatchKey?: boolean): number => {
        if (tokenIter >= currSCL.length) {
            return VALIDSCL_NUMBER;
        }
        let token = currSCL[tokenIter];
        for (const childNode of parentNode.children) {
            switch (true) {
                case childNode.type === "keyword" && match(token, childNode.value, statement, document):
                    if (childNode.value === 'FROM') {
                        isfrom = true;
                    } else if (childNode.value === 'TO') {
                        isto = true;
                        isfrom = false;
                    } else if (childNode.value === 'OPTION') {
                        isto = false;
                        isfrom = false;
                    }
                    dealWithCompletion(token, childNode, isSET);
                    tokenIter ++;
                    return matchToken(childNode);

                case !onlyMatchKey && (childNode.type ==="value" && !token.is_eoStatement):
                    dealWithCompletion(token, childNode, isSET);
                    dealWithSETMacro(childNode,
                        statement, document,
                        isSET, isfrom, isto);
                    const result = dealWithValue(childNode, tokenIter, statement, document);
                    if (!result[1]) { // err
                        return result[0] as number;
                    }
                    tokenIter = (result[0] as number) + 1;
                    return matchToken(childNode);

                case !onlyMatchKey && (childNode.type === "eos" && token.is_eoStatement):
                    dealWithCompletion(token, childNode, isSET);
                    tokenIter ++;
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

        if (!isNullOrUndefined(parentNode.parent) && !parentNode.nogoback) {
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
        processSETMacro(statement, document, false);
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
                processSETMacro(statement, document, true);
                return;
            }
        }
    }
    document.pushDiagnostic(
        currSCL[iterator], statement,
        DiagnosticSeverity.Error,
        `Invalid value specified`);
    processSETMacro(statement, document, true);
    return;
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

function processSETMacro(statement: SCLstatement, document: SCLDocument, alreadyHasErr: boolean) {
    const currSCL: ITokenizedString[] = statement.tokens;
    if (currSCL.length < 2) {
        return;
    }
    if (!currSCL[1].value.toUpperCase().startsWith("EL")) {
        return;
    }
    const action = currSCL[0].value.toUpperCase();
    const documentFT: IFromTocheck = document.setCheck;
    const statementFT: IFromTocheck = statement.fromtoCheck;
    let missFrom = false;
    let missTo = false;
    switch (true) {
        case action.startsWith("ADD") || action.startsWith("UPD"):
            if (!statementFT.from.FILE && !documentFT.from.FILE) {
                missFrom = true;
            }
            if (!(statementFT.to.location.ENVIRONMENT || documentFT.to.location.ENVIRONMENT) ||
                !(statementFT.to.location.SYSTEM || documentFT.to.location.SYSTEM) ||
                !(statementFT.to.location.SUBSYSTEM || documentFT.to.location.SUBSYSTEM) ||
                !(statementFT.to.location.TYPE || documentFT.to.location.TYPE)) {
                    missTo = true;
                }
            break;

        case action.startsWith("DEL") || action.startsWith("GEN") || action.startsWith("MOV") ||
             action.startsWith("SIG"):
            if (!(statementFT.from.location.ENVIRONMENT || documentFT.from.location.ENVIRONMENT) ||
                !(statementFT.from.location.STAGE || documentFT.from.location.STAGE) ||
                !(statementFT.from.location.SYSTEM || documentFT.from.location.SYSTEM) ||
                !(statementFT.from.location.SUBSYSTEM || documentFT.from.location.SUBSYSTEM) ||
                !(statementFT.from.location.TYPE || documentFT.from.location.TYPE)) {
                    missFrom = true;
                }
            break;

        case action.startsWith("RET"):
            if (!(statementFT.from.location.ENVIRONMENT || documentFT.from.location.ENVIRONMENT) ||
                !(statementFT.from.location.STAGE || documentFT.from.location.STAGE) ||
                !(statementFT.from.location.SYSTEM || documentFT.from.location.SYSTEM) ||
                !(statementFT.from.location.SUBSYSTEM || documentFT.from.location.SUBSYSTEM) ||
                !(statementFT.from.location.TYPE || documentFT.from.location.TYPE)) {
                    missFrom = true;
                }
                if (!statementFT.to.FILE && !documentFT.to.FILE) {
                    missTo = true;
                }
            break;

        case action.startsWith("TRA"):
            if (!(statementFT.from.location.ENVIRONMENT || documentFT.from.location.ENVIRONMENT) ||
                !(statementFT.from.location.STAGE || documentFT.from.location.STAGE) ||
                !(statementFT.from.location.SYSTEM || documentFT.from.location.SYSTEM) ||
                !(statementFT.from.location.SUBSYSTEM || documentFT.from.location.SUBSYSTEM) ||
                !(statementFT.from.location.TYPE || documentFT.from.location.TYPE)) {
                    missFrom = true;
                }
            if (!(statementFT.to.location.ENVIRONMENT || documentFT.to.location.ENVIRONMENT) ||
                !(statementFT.to.location.STAGE || documentFT.to.location.STAGE) ||
                !(statementFT.to.location.SYSTEM || documentFT.to.location.SYSTEM) ||
                !(statementFT.to.location.SUBSYSTEM || documentFT.to.location.SUBSYSTEM) ||
                !(statementFT.to.location.TYPE || documentFT.to.location.TYPE)) {
                    missTo = true;
                }
            break;

        default:
            break;
    }

    if (!alreadyHasErr) {
        if (missFrom || missTo) {
            const existingErr = countExistingErrDiagnose(statement);
            if (existingErr > 0) {
                alreadyHasErr = true;
            }
        }
    }
    if (missFrom && !alreadyHasErr) { // only push FROM/TO err when there's no exising err, since it covers up existing err
        let diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: {
                start: document.textDocument.positionAt(statement.starti),
                end: document.textDocument.positionAt(statement.endi)
            },
            message: "FROM clause incomplete in the current SCL",
            source: 'Endevor SCL extension'
        };

        statement.diagnostics.push({
            diagnostic,
            starti: statement.starti,
            endi: statement.endi,
        });
    }
    if (missTo && !alreadyHasErr) {
        let diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: {
                start: document.textDocument.positionAt(statement.starti),
                end: document.textDocument.positionAt(statement.endi)
            },
            message: "TO clause incomplete in the current SCL",
            source: 'Endevor SCL extension'
        };

        statement.diagnostics.push({
            diagnostic,
            starti: statement.starti,
            endi: statement.endi,
        });
    }
}

function countExistingErrDiagnose(statement: SCLstatement): number {
    let num = 0;
    statement.diagnostics.forEach((diag) => {
        if (diag.diagnostic.severity === DiagnosticSeverity.Error) {
            num ++;
        }
    });
    return num;
}