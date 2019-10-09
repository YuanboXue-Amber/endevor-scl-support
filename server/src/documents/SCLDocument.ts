import { TextDocument, Diagnostic, DiagnosticSeverity, TextEdit, CompletionItemKind } from 'vscode-languageserver';
import { ITokenizedString, Tokenizer } from '../parser/Tokenizer';
import { isNullOrUndefined } from 'util';
import { SCLDocumentManager, actionCompletion } from './SCLDocumentManager';
import { match, matchWithoutDiagnose, ParserTags } from '../parser/ParserTags';
import { SETtree, ADDtree, UPDATEtree, DELETEtree, GENERATEtree, MOVEtree, RETRIEVEtree, SIGNINtree, TRANSFERtree,
    APPROVEtree,
    DENYtree,
    BACKINtree,
    BACKOUTtree,
    CASTtree,
    DEFINEPACKAGEtree,
    EXECUTEtree,
    RESETtree,
    COMMITtree,
    LISTtree} from '../parser/syntaxTrees/PrepareTrees';
import { diagnose } from '../parser/syntaxTrees/Parser';
import { IFromTocheck } from '../parser/syntaxTrees/doc/Inode';
import { QUICKFIX_CHOICE_MSG } from '../CodeActionProvider';

/**
 * An interface that extends the vscode diagnostic.
 * starti and endi is the range of diagnostic. This is used when updating document.
 * We first calculate the starti and endi, then update the diagnostic.range
 *
 * @export
 * @interface ISCLDiagnostic
 */
export interface ISCLDiagnostic {
    diagnostic: Diagnostic;
    starti: number;
    endi: number;
}

/**
 * Informaton about one scl statement.
 * Its tokens. Where it start and end. It's diagnostic information
 *
 * @export
 * @class SCLstatement
 */
export class SCLstatement {
    starti: number;
    endi: number;
    tokens: ITokenizedString[] = [];
    diagnostics: ISCLDiagnostic[] = [];
    isRest: boolean = false;

    fromtoCheck: IFromTocheck = {
        from: {
            FILE: false,
            location: {
                ENVIRONMENT: false,
                SYSTEM: false,
                SUBSYSTEM: false,
                TYPE: false,
                STAGE: false,
            }
        },
        to: {
            FILE: false,
            location: {
                ENVIRONMENT: false,
                SYSTEM: false,
                SUBSYSTEM: false,
                TYPE: false,
                STAGE: false,
            }
        },
    };

    /**
     * Creates an instance of SCLstatement from tokens.
     *
     * @param {ITokenizedString[]} tokens
     * @param {number} [startiOffset] The offset for all the indexes in the object to be created
     * @memberof SCLstatement
     */
    constructor(tokens: ITokenizedString[], startiOffset?: number) {
        if (isNullOrUndefined(startiOffset)) {
            startiOffset = 0;
        }

        this.starti = tokens[0].starti + startiOffset;
        this.endi = tokens[tokens.length-1].starti + tokens[tokens.length-1].value.length + startiOffset;
        if (startiOffset === 0) {
            this.tokens = tokens;
        } else {
            tokens.forEach((token) => {
                token.starti += startiOffset as number;
                this.tokens.push(token);
            });
        }
        this.diagnostics = [];
        this.fromtoCheck = {
            from: {
                FILE: false,
                location: {
                    ENVIRONMENT: false,
                    SYSTEM: false,
                    SUBSYSTEM: false,
                    TYPE: false,
                    STAGE: false,
                }
            },
            to: {
                FILE: false,
                location: {
                    ENVIRONMENT: false,
                    SYSTEM: false,
                    SUBSYSTEM: false,
                    TYPE: false,
                    STAGE: false,
                }
            },
        };
        this.isRest = false;
        if (this.tokens.length > 0 && this.tokens[0].value === "REST") {
            this.isRest = true;
            // this.tokens.splice(0, 1);
        }
    }
}

/**
 * Information about an entire document.
 * Its content info. Its scl statements.
 *
 * @export
 * @class SCLDocument
 */
export class SCLDocument {
    textDocument: TextDocument;
    statements: SCLstatement[] = [];
    setCheck: IFromTocheck = {
        from: {
            FILE: false,
            location: {
                ENVIRONMENT: false,
                SYSTEM: false,
                SUBSYSTEM: false,
                TYPE: false,
                STAGE: false,
            }
        },
        to: {
            FILE: false,
            location: {
                ENVIRONMENT: false,
                SYSTEM: false,
                SUBSYSTEM: false,
                TYPE: false,
                STAGE: false,
            }
        },
    };

    constructor(textDocument: TextDocument) {
        this.textDocument = textDocument;
        this.initStatements(); // read the whole content of the document and do synatx diagnose
    }

    /**
     * Tokenize the input string into an array of SCLstatement
     *
     * @private
     * @param {string} text
     * @param {number} [startiOffset] The offset for the current text in the whole document
     * @returns {SCLstatement[]}
     * @memberof SCLDocument
     */
    private parseTextIntoSCLstatementsTokens(text: string, startiOffset?: number): SCLstatement[] {
        const statements: SCLstatement[] = [];
        const tokenizeTextContent: Tokenizer = new Tokenizer(text);
        let token: ITokenizedString = tokenizeTextContent.peekNext();
        let statement: ITokenizedString[] = [];
        while (!isNullOrUndefined(token) && !token.is_eoInput) {
            token = tokenizeTextContent.readNext();

            if (token.is_eoInput) {
                if (statement.length > 0) {
                    statements.push(new SCLstatement(statement, startiOffset));
                }
                break;
            }

            statement.push(token);

            if (token.is_eoStatement) {
                statements.push(new SCLstatement(statement, startiOffset));
                statement = [];
            }
        }
        return statements;
    }

    /**
     * Parse the whole document into an array of scl statements, and do synatx diagnose
     *
     * @private
     * @returns
     * @memberof SCLDocument
     */
    private initStatements() {
        if (isNullOrUndefined(this.textDocument)) {
            this.statements = [];
            return;
        }
        this.statements = this.parseTextIntoSCLstatementsTokens(this.textDocument.getText());
        this.walkStatements();
    }

    /**
     * Walk through all statements in this document to generate all information we need to send to client,
     * e.g. diagnoses, completion, quickfixes, highlights, hovers ...
     *
     * @private
     * @memberof SCLDocument
     */
    private walkStatements() {
        this.statements.forEach((scl) => { this.walkStatement(scl); });
    }

    /**
     * Walk though one statement
     *
     * @private
     * @param {SCLstatement} statement
     * @memberof SCLDocument
     */
    private walkStatement(statement: SCLstatement) {
        let token = statement.tokens[0];
        if (token.value === "REST") {
            if (statement.tokens.length > 1) {
                token = statement.tokens[1];
            } else {
                token.completionItems = [];
                for (const item of actionCompletion) {
                    token.completionItems.push({
                        label: item.toUpperCase() + " ",
                        kind: CompletionItemKind.Function,
                        documentation: "Endevor SCL keyword"
                    });
                }

                this.pushDiagnostic(
                    token, statement,
                    DiagnosticSeverity.Error,
                    `No SCL following label REST`,
                    `${QUICKFIX_CHOICE_MSG}${actionCompletion.join(", ")}`,
                    token);
                return;
            }
        }
        if (match(token, "SET", statement, this))
            diagnose(SETtree, statement, this);
        else if (match(token, "ADD", statement, this))
            diagnose(ADDtree, statement, this);
        else if (match(token, "UPDATE", statement, this))
            diagnose(UPDATEtree, statement, this);
        else if (match(token, "DELETE", statement, this))
            diagnose(DELETEtree, statement, this);
        else if (match(token, "GENERATE", statement, this))
            diagnose(GENERATEtree, statement, this);
        else if (match(token, "MOVE", statement, this))
            diagnose(MOVEtree, statement, this);
        else if (match(token, "RETRIEVE", statement, this))
            diagnose(RETRIEVEtree, statement, this);
        else if (match(token, "SIGNIN", statement, this))
            diagnose(SIGNINtree, statement, this);
        else if (match(token, "TRANSFER", statement, this))
            diagnose(TRANSFERtree, statement, this);

        else if (match(token, "APPROVE", statement, this))
            diagnose(APPROVEtree, statement, this);
        else if (match(token, "DENY", statement, this))
            diagnose(DENYtree, statement, this);
        else if (match(token, "BACKIN", statement, this))
            diagnose(BACKINtree, statement, this);
        else if (match(token, "BACKOUT", statement, this))
            diagnose(BACKOUTtree, statement, this);
        else if (match(token, "CAST", statement, this))
            diagnose(CASTtree, statement, this);
        else if (match(token, "DEFINE", statement, this))
            diagnose(DEFINEPACKAGEtree, statement, this);
        else if (match(token, "EXECUTE", statement, this))
            diagnose(EXECUTEtree, statement, this);
        else if (match(token, "RESET", statement, this))
            diagnose(RESETtree, statement, this);
        else if (match(token, "COMMIT", statement, this))
            diagnose(COMMITtree, statement, this);

        else if (match(token, "LIST", statement, this))
            diagnose(LISTtree, statement, this);

        else {
            this.pushDiagnostic(
                token, statement,
                DiagnosticSeverity.Error,
                `Invalid value specified`,
                `${QUICKFIX_CHOICE_MSG}${actionCompletion.join(", ")}`,
                token);
        }
    }

    fullUpdate() {
        this.setCheck = {
            from: {
                FILE: false,
                location: {
                    ENVIRONMENT: false,
                    SYSTEM: false,
                    SUBSYSTEM: false,
                    TYPE: false,
                    STAGE: false,
                }
            },
            to: {
                FILE: false,
                location: {
                    ENVIRONMENT: false,
                    SYSTEM: false,
                    SUBSYSTEM: false,
                    TYPE: false,
                    STAGE: false,
                }
            },
        };
        if (isNullOrUndefined(this.textDocument)) {
            this.statements = [];
            return;
        }
        this.statements = this.parseTextIntoSCLstatementsTokens(this.textDocument.getText());
        this.walkStatements();
    }

    /**
     * NEVER USED
     *
     * @param {string} newText The new text replacing the original text
     * @param {number} start The start index of the original text
     * @param {number} end The end index of the original text
     * @param {string} origContent The entire original content before change
     * @memberof SCLDocument
     */
    update(newText: string, start: number, end: number, origContent: string) {
        const newTextUp = newText.toUpperCase();
        const origContentUp = origContent.toUpperCase();
        if ((newTextUp.match(/\b(SET)\b/) &&
             (newTextUp.match(/\b(FRO(M|\b))\b/) ||
              newTextUp.match(/\b(TO)\b/)) ) ||
            (origContentUp.match(/(.*)\b(SET)\b(.*)/) &&
             (origContentUp.match(/\b(FRO(M|\b))\b/) ||
              origContentUp.match(/\b(TO)\b/)) ) ) {
            // redo the whole document whenever there's SET FROM/TO involved
            this.setCheck = {
                from: {
                    FILE: false,
                    location: {
                        ENVIRONMENT: false,
                        SYSTEM: false,
                        SUBSYSTEM: false,
                        TYPE: false,
                        STAGE: false,
                    }
                },
                to: {
                    FILE: false,
                    location: {
                        ENVIRONMENT: false,
                        SYSTEM: false,
                        SUBSYSTEM: false,
                        TYPE: false,
                        STAGE: false,
                    }
                },
            };
            const newContent = origContent.substring(0, start)
                                + newText
                                + origContent.substring(end, origContent.length);
            this.statements = this.parseTextIntoSCLstatementsTokens(newContent);
            this.walkStatements();
            return;
        }

        // otherwise incremental update
        const oldLength = end - start;
        const indexPlus = newText.length - oldLength;

        const updatePositionInStatement = ((indexPlus: number, statement: SCLstatement) => {
            statement.starti = statement.starti + indexPlus;
            statement.endi = statement.endi + indexPlus;
            for (const token of statement.tokens) {
                token.starti = token.starti + indexPlus;
            }
            for (const diag of statement.diagnostics) {
                diag.starti = diag.starti + indexPlus;
                diag.endi = diag.endi + indexPlus;
                // the diag.diagnostic.range will be refreshed after all the updates are processed, and textDocument is updated
            }
        });

        let affectedRange = {
            start,
            end
        }; // the start and end index in the textDocument, of where the change affected
        for (let i = this.statements.length - 1; i >= 0 ; -- i) {
            if (this.statements[i].starti > affectedRange.end) {
                // start end statement.starti statement.endi
                updatePositionInStatement(indexPlus, this.statements[i]);
                continue;
            } else if (this.statements[i].endi < affectedRange.start) {
                // statement.starti statement.endi start end, and statement is a complete statement
                const lastToken = this.statements[i].tokens[this.statements[i].tokens.length-1];
                if (lastToken.is_eoStatement) {
                    continue;
                }
            }
            affectedRange.start = Math.min(
                affectedRange.start, this.statements[i].starti);
            affectedRange.end = Math.max(
                affectedRange.end, this.statements[i].endi);

            // before remove this statement, update SCLDocumentManager.numberOfProblems
            SCLDocumentManager.numberOfProblems = SCLDocumentManager.numberOfProblems - this.statements[i].diagnostics.length;
            if (SCLDocumentManager.numberOfProblems < 0) {
                SCLDocumentManager.numberOfProblems = 0;
            }
            this.statements.splice(i, 1);
        }

        const newTextTobeParse: string = origContent.substring(affectedRange.start, start)
                                            + newText
                                            + origContent.substring(end, affectedRange.end);

        const newStatements: SCLstatement[] = this.parseTextIntoSCLstatementsTokens(newTextTobeParse, affectedRange.start);
        newStatements.forEach((newscl) => {
            this.walkStatement(newscl);
            this.statements.push(newscl);
        });
    }

    /**
     * Push diagnostic information into the corresponded SCLstatement
     *
     * @param {ITokenizedString} diagnosedToken the token where the error/warning happened
     * @param {SCLstatement} statement the scl statement where the error/warning happened
     * @param {DiagnosticSeverity} severity
     * @param {string} message
     * @param {string} [relatedMsg]
     * @returns
     * @memberof SCLDocument
     */
    pushDiagnostic(
        diagnosedToken: ITokenizedString,
        statement: SCLstatement,
        severity: DiagnosticSeverity,
        message: string,
        relatedMsg?: string,
        relatedToken?: ITokenizedString
        ) {

        if (SCLDocumentManager.numberOfProblems >= SCLDocumentManager.config.maxNumberOfProblems) {
            return;
        }
        if (diagnosedToken.starti < statement.starti ||
            diagnosedToken.starti + diagnosedToken.value.length > statement.endi) {
            // The token is not in the scl!!
            return;
        }

        SCLDocumentManager.numberOfProblems ++;

        let diagnostic: Diagnostic = {
            severity: severity,
            range: {
                start: this.textDocument.positionAt(diagnosedToken.starti),
                end: this.textDocument.positionAt(diagnosedToken.starti + diagnosedToken.value.length)
            },
            message: message,
            source: 'Endevor SCL extension'
        };
        if (SCLDocumentManager.capabilities.hasDiagnosticRelatedInformationCapability &&
            !isNullOrUndefined(relatedMsg) && !isNullOrUndefined(relatedToken)) {
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: this.textDocument.uri,
                        range: {
                            start: this.textDocument.positionAt(relatedToken.starti),
                            end: this.textDocument.positionAt(relatedToken.starti + relatedToken.value.length),
                        }
                    },
                    message: relatedMsg,
                }
            ];
        }
        statement.diagnostics.push({
            diagnostic,
            starti: diagnosedToken.starti,
            endi: diagnosedToken.starti + diagnosedToken.value.length,
        });
    }

    private formatStatement(statement: SCLstatement): TextEdit[] {
        const tokens: ITokenizedString[] = statement.tokens;
        const edits: TextEdit[] = [];

        const checkIfKeyword = ((token: ITokenizedString) => {
            Object.entries(ParserTags).forEach(([key, value]) => {
                if (matchWithoutDiagnose(token, value)) {
                    token.is_keyword = true;
                    return;
                }
            });
        }); // do not rely on parser because scl can be invalid, and parser will quit before it goes to the end

        // Step 1, make line endings after value, make only 1 space between each token
        for (let i = 0; i < tokens.length-1; ++ i) {
            checkIfKeyword(tokens[i]);
            if (tokens[i].value === "," || tokens[i].value === ")" || tokens[i].value.endsWith(")")) {
                edits.push({
                    range: {
                        start: this.textDocument.positionAt(tokens[i].starti + tokens[i].value.length),
                        end: this.textDocument.positionAt(tokens[i+1].starti),
                    },
                    newText: "\n"
                });
                continue;
            }
            if (!tokens[i].is_keyword) {
                if (tokens[i+1].value !== "," &&
                    tokens[i+1].value !== ")" &&
                    !matchWithoutDiagnose(tokens[i+1], ParserTags.LEVEL)) {
                    edits.push({
                        range: {
                            start: this.textDocument.positionAt(tokens[i].starti + tokens[i].value.length),
                            end: this.textDocument.positionAt(tokens[i+1].starti),
                        },
                        newText: "\n"
                    });
                    continue;
                }
            }
            let starti = tokens[i].starti + tokens[i].value.length;
            let endi = tokens[i+1].starti;
            if (endi < starti)
                starti = endi;
            edits.push({
                range: {
                    start: this.textDocument.positionAt(starti),
                    end: this.textDocument.positionAt(endi),
                },
                newText: " "
            });
        }

        // Step2. indent at special keywords
        const indentKey = [ParserTags.FROM, ParserTags.TO, ParserTags.OPTION,
            ParserTags.THROUGH, ParserTags.WHERE, ParserTags.VERSION, ParserTags.DATA];
        const searchIndentKey = ((token: ITokenizedString): string => {
            for (const key of indentKey) {
                if (matchWithoutDiagnose(token, key)) {
                    return key;
                }
            }
            return "";
        });
        const indentMap: Map<string, number> = new Map();
        indentMap.set(ParserTags.FROM, 9);
        indentMap.set(ParserTags.TO, 7);
        indentMap.set(ParserTags.OPTION, 12);
        let indent = 0;
        for (let i = 1; i < tokens.length-1; ++ i) {
            if (tokens[i].is_keyword) {
                const searchKey = searchIndentKey(tokens[i]);
                if (searchKey.length > 0) {
                    edits.push({
                        range: {
                            start: this.textDocument.positionAt(tokens[i].starti),
                            end: this.textDocument.positionAt(tokens[i].starti),
                        },
                        newText: " ".repeat(4)
                    });
                    const newIndent = indentMap.get(searchKey);
                    if (!isNullOrUndefined(newIndent)) {
                        indent = newIndent;
                    }
                    continue;
                }
                if (!tokens[i-1].is_keyword && !tokens[i].value.match(/[,()]/)) {
                    edits.push({
                        range: {
                            start: this.textDocument.positionAt(tokens[i].starti),
                            end: this.textDocument.positionAt(tokens[i].starti),
                        },
                        newText: " ".repeat(indent)
                    });
                }
            } else {
                if (tokens[i-1].value === ",")
                    edits.push({
                        range: {
                            start: this.textDocument.positionAt(tokens[i].starti),
                            end: this.textDocument.positionAt(tokens[i].starti),
                        },
                        newText: " ".repeat(indent)
                    });
            }
        }
        return edits;
    }

    formatDocument(): TextEdit[] {
        let edits: TextEdit[] = [];
        edits.push({
            range: {
                start: this.textDocument.positionAt(0),
                end: this.textDocument.positionAt(this.statements[0].starti),
            },
            newText: ""
        });

        let i = 0;
        for (i = 0; i < this.statements.length-1; ++ i) {
            edits = edits.concat(this.formatStatement(this.statements[i]));
            edits.push({
                range: {
                    start: this.textDocument.positionAt(this.statements[i].endi),
                    end: this.textDocument.positionAt(this.statements[i+1].starti),
                },
                newText: "\n\n"
            });
        }
        edits = edits.concat(this.formatStatement(this.statements[i]));
        edits.push({
            range: {
                start: this.textDocument.positionAt(this.statements[i].endi),
                end: this.textDocument.positionAt(this.statements[i].endi),
            },
            newText: "\n"
        });
        return edits;
    }
}