import { TextDocument, Diagnostic, DiagnosticSeverity, TextEdit, CompletionItemKind } from 'vscode-languageserver';
import { ITokenizedString, Tokenizer } from '../parser/Tokenizer';
import { isNullOrUndefined } from 'util';
import { SCLDocumentManager, actionCompletion } from './SCLDocumentManager';
import { dispatcher} from '../parser/PreParserUtils';
import { QUICKFIX_CHOICE_MSG } from '../CodeActionProvider';
import { Parser } from '../parser/Parser';

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
    diagnostics: Diagnostic[] = [];

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
    setFromToMemo = {
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
        this.setFromToMemo = {
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
        this.initStatements(); // read the whole content of the document and do synatx diagnose
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
        while (!isNullOrUndefined(token) && token.value.length > 0) {
            token = tokenizeTextContent.readNext();

            if (token.value.length <= 0) {
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
        let rootNode = dispatcher(statement.tokens);
        if (!isNullOrUndefined(rootNode)) {
            const parse = new Parser(this.textDocument, statement.tokens, rootNode);
            parse.parser();
            statement.diagnostics = parse.diagnoses;
            this.processFromTo(statement, parse.fromMemo, parse.toMemo);
        } else {
            if (statement.tokens.length > 0)
                this.pushDiagnostic(
                    statement.tokens[0].starti, statement.tokens[0].starti + statement.tokens[0].value.length, statement,
                    DiagnosticSeverity.Error,
                    `Invalid value specified`,
                    `${QUICKFIX_CHOICE_MSG}${actionCompletion.join(", ")}`,
                    statement.tokens[0]);
        }
    }

    private processFromTo(statement: SCLstatement, fromInStatement: string[], toInStatement: string[]) {
        if (SCLDocumentManager.numberOfProblems >= SCLDocumentManager.config.maxNumberOfProblems ||
            statement.tokens.length < 2)
            return;

        // don't check for this error if there's already error
        let existingErrDiagnoseCount = 0;
        statement.diagnostics.forEach((diag) => {
            if (diag.severity === DiagnosticSeverity.Error)
                existingErrDiagnoseCount ++;
        });
        if (existingErrDiagnoseCount > 0)
            return;

        let action = statement.tokens[0].value.toUpperCase();
        let actionObj = statement.tokens[1].value.toUpperCase();
        if (actionObj.startsWith("PAC"))
            return;

        const convert = (obj:
            { from:
                { location: { ENVIRONMENT: boolean; STAGE: boolean; SYSTEM: boolean; SUBSYSTEM: boolean; TYPE: boolean; };
                FILE: boolean; };
            to:
                { location: { ENVIRONMENT: boolean; STAGE: boolean; SYSTEM: boolean; SUBSYSTEM: boolean; TYPE: boolean; };
                FILE: boolean; }; }) => {
            fromInStatement.forEach((key) => {
                switch (key.toUpperCase()) {
                    case "ENVIRONMENT":
                        obj.from.location.ENVIRONMENT = true;
                        break;
                    case "STAGE":
                        obj.from.location.STAGE = true;
                        break;
                    case "STAGE NUMBER":
                        obj.from.location.STAGE = true;
                        break;
                    case "SYSTEM":
                        obj.from.location.SYSTEM = true;
                        break;
                    case "SUBSYSTEM":
                        obj.from.location.SUBSYSTEM = true;
                        break;
                    case "TYPE":
                        obj.from.location.TYPE = true;
                        break;
                    default:
                        obj.from.FILE = true;
                        break;
                }
            });
            toInStatement.forEach((key) => {
                switch (key.toUpperCase()) {
                    case "ENVIRONMENT":
                        obj.to.location.ENVIRONMENT = true;
                        break;
                    case "STAGE":
                        obj.to.location.STAGE = true;
                        break;
                    case "STAGE NUMBER":
                        obj.to.location.STAGE = true;
                        break;
                    case "SYSTEM":
                        obj.to.location.SYSTEM = true;
                        break;
                    case "SUBSYSTEM":
                        obj.to.location.SUBSYSTEM = true;
                        break;
                    case "TYPE":
                        obj.to.location.TYPE = true;
                        break;
                    default:
                        obj.to.FILE = true;
                        break;
                }
            });
        };

        if (action === "SET") {
            convert(this.setFromToMemo);
            return;
        }

        let statementFT = {
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
        convert(statementFT);

        let missFrom = false;
        let missTo = false;
        switch (true) {
            case action.startsWith("ADD") || action.startsWith("UPD"):
                if (!statementFT.from.FILE && !this.setFromToMemo.from.FILE) {
                    missFrom = true;
                }
                if (!(statementFT.to.location.ENVIRONMENT || this.setFromToMemo.to.location.ENVIRONMENT) ||
                    !(statementFT.to.location.SYSTEM || this.setFromToMemo.to.location.SYSTEM) ||
                    !(statementFT.to.location.SUBSYSTEM || this.setFromToMemo.to.location.SUBSYSTEM) ||
                    !(statementFT.to.location.TYPE || this.setFromToMemo.to.location.TYPE)) {
                        missTo = true;
                    }
                break;

            case action.startsWith("DEL") || action.startsWith("GEN") || action.startsWith("MOV") ||
                 action.startsWith("SIG"):
                if (!(statementFT.from.location.ENVIRONMENT || this.setFromToMemo.from.location.ENVIRONMENT) ||
                    !(statementFT.from.location.STAGE || this.setFromToMemo.from.location.STAGE) ||
                    !(statementFT.from.location.SYSTEM || this.setFromToMemo.from.location.SYSTEM) ||
                    !(statementFT.from.location.SUBSYSTEM || this.setFromToMemo.from.location.SUBSYSTEM) ||
                    !(statementFT.from.location.TYPE || this.setFromToMemo.from.location.TYPE)) {
                        missFrom = true;
                    }
                break;

            case action.startsWith("RET"):
                if (!(statementFT.from.location.ENVIRONMENT || this.setFromToMemo.from.location.ENVIRONMENT) ||
                    !(statementFT.from.location.STAGE || this.setFromToMemo.from.location.STAGE) ||
                    !(statementFT.from.location.SYSTEM || this.setFromToMemo.from.location.SYSTEM) ||
                    !(statementFT.from.location.SUBSYSTEM || this.setFromToMemo.from.location.SUBSYSTEM) ||
                    !(statementFT.from.location.TYPE || this.setFromToMemo.from.location.TYPE)) {
                        missFrom = true;
                    }
                if (!statementFT.to.FILE && !this.setFromToMemo.to.FILE && !SCLDocumentManager.config.isREST) {
                    missTo = true;
                }
                break;

            case action.startsWith("TRA"):
                if (!(statementFT.from.location.ENVIRONMENT || this.setFromToMemo.from.location.ENVIRONMENT) ||
                    !(statementFT.from.location.STAGE || this.setFromToMemo.from.location.STAGE) ||
                    !(statementFT.from.location.SYSTEM || this.setFromToMemo.from.location.SYSTEM) ||
                    !(statementFT.from.location.SUBSYSTEM || this.setFromToMemo.from.location.SUBSYSTEM) ||
                    !(statementFT.from.location.TYPE || this.setFromToMemo.from.location.TYPE)) {
                        missFrom = true;
                    }
                if (!(statementFT.to.location.ENVIRONMENT || this.setFromToMemo.to.location.ENVIRONMENT) ||
                    !(statementFT.to.location.STAGE || this.setFromToMemo.to.location.STAGE) ||
                    !(statementFT.to.location.SYSTEM || this.setFromToMemo.to.location.SYSTEM) ||
                    !(statementFT.to.location.SUBSYSTEM || this.setFromToMemo.to.location.SUBSYSTEM) ||
                    !(statementFT.to.location.TYPE || this.setFromToMemo.to.location.TYPE)) {
                        missTo = true;
                    }
                break;

            case action.startsWith("LIS"):
                if (!statementFT.to.FILE && !this.setFromToMemo.to.FILE && !SCLDocumentManager.config.isREST) {
                    missTo = true;
                }
                if (actionObj.startsWith("STA") && !(statementFT.from.location.ENVIRONMENT || this.setFromToMemo.from.location.ENVIRONMENT)){
                    missFrom = true;
                }
                if (( actionObj.startsWith("SUB") || actionObj.startsWith("TYP") ) &&
                    ( !(statementFT.from.location.ENVIRONMENT || this.setFromToMemo.from.location.ENVIRONMENT) ||
                      !(statementFT.from.location.STAGE || this.setFromToMemo.from.location.STAGE) ||
                      !(statementFT.from.location.SYSTEM || this.setFromToMemo.from.location.SYSTEM) ) ) {
                    missFrom = true;
                }
                if (actionObj.startsWith("SYS") &&
                    ( !(statementFT.from.location.ENVIRONMENT || this.setFromToMemo.from.location.ENVIRONMENT) ||
                      !(statementFT.from.location.STAGE || this.setFromToMemo.from.location.STAGE) ) ) {
                    missFrom = true;
                }
                if (( actionObj.startsWith("ELE") ) &&
                     (!(statementFT.from.location.ENVIRONMENT || this.setFromToMemo.from.location.ENVIRONMENT) ||
                      !(statementFT.from.location.STAGE || this.setFromToMemo.from.location.STAGE) ||
                      !(statementFT.from.location.SYSTEM || this.setFromToMemo.from.location.SYSTEM) ||
                      !(statementFT.from.location.SUBSYSTEM || this.setFromToMemo.from.location.SUBSYSTEM) ||
                      !(statementFT.from.location.TYPE || this.setFromToMemo.from.location.TYPE)) ) {
                    missFrom = true;
                }
                break;

            default:
                break;
        }

        if (missFrom) { // only push FROM/TO err when there's no exising err, since it covers up existing err
            this.pushDiagnostic(
                statement.starti, statement.endi, statement,
                DiagnosticSeverity.Error,
                "FROM clause incomplete in the current SCL");

        }
        if (missTo) {
            this.pushDiagnostic(
                statement.starti, statement.endi, statement,
                DiagnosticSeverity.Error,
                "TO clause incomplete in the current SCL");
        }
    }

    fullUpdate() {
        this.setFromToMemo = {
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
        this.statements = [];
        if (isNullOrUndefined(this.textDocument)) {
            return;
        }
        this.initStatements();
    }

    private formatStatement(statement: SCLstatement): TextEdit[] {
        const tokens: ITokenizedString[] = statement.tokens;
        const edits: TextEdit[] = [];

        for (let i = 0; i < tokens.length-1; ++ i) {
            let starti = tokens[i].starti + tokens[i].value.length;
            let endi = tokens[i+1].starti;
            if (endi < starti)
                starti = endi;
            let newText = " "; // by default make only 1 space between each token
            if (!isNullOrUndefined(tokens[i].rightDistance)) {
                newText = tokens[i].rightDistance as string;
            }
            edits.push({
                range: {
                    start: this.textDocument.positionAt(starti),
                    end: this.textDocument.positionAt(endi),
                },
                newText
            });
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

    /**
     * Push diagnostic information into the corresponded SCLstatement
     *
     *
     * @param {number} startIndex
     * @param {number} endIndex
     * @param {SCLstatement} statement
     * @param {DiagnosticSeverity} severity
     * @param {string} message
     * @param {string} [relatedMsg]
     * @param {ITokenizedString} [relatedToken]
     * @returns
     * @memberof SCLDocument
     */
    pushDiagnostic(
        startIndex: number,
        endIndex: number,
        statement: SCLstatement,
        severity: DiagnosticSeverity,
        message: string,
        relatedMsg?: string,
        relatedToken?: ITokenizedString
        ) {

        if (SCLDocumentManager.numberOfProblems >= SCLDocumentManager.config.maxNumberOfProblems) {
            return;
        }
        if (startIndex < statement.starti ||
            endIndex > statement.endi) {
            // The token is not in the scl!!
            return;
        }

        SCLDocumentManager.numberOfProblems ++;

        let diagnostic: Diagnostic = {
            severity: severity,
            range: {
                start: this.textDocument.positionAt(startIndex),
                end: this.textDocument.positionAt(endIndex)
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
        statement.diagnostics.push(diagnostic);
    }
}