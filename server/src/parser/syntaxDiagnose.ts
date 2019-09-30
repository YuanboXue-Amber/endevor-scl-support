import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TokenizedString, Tokenizer } from "./tokenizer";
import { match } from "./parserTags";
import { isNullOrUndefined } from "util";
import { parseSetAction } from "./syntaxTrees/setCommands";

export class SyntaxDiagnose {
    textDocument: TextDocument;
    hasDiagnosticRelatedInformationCapability: boolean;
    textDocContent: string;
    tokenizingTextContent: Tokenizer;
    diagnostics: Diagnostic[] = [];

    constructor(textDocument: TextDocument, hasDiagnosticRelatedInformationCapability: boolean) {
        this.textDocument = textDocument;
        this.hasDiagnosticRelatedInformationCapability = hasDiagnosticRelatedInformationCapability;
        this.textDocContent = textDocument.getText();
        this.tokenizingTextContent = new Tokenizer(this.textDocContent);
        this.diagnostics = [];
        this.SplitAndDispatchSCL();
    }

    /**
     * For the entire file content, read one by one until we met the end of an SCL, send it to process.
     * Then continue to read the next one.
     *
     * @private
     * @memberof SyntaxDiagnose
     */
    private SplitAndDispatchSCL() {
        let token: TokenizedString = this.tokenizingTextContent.peekNext();
        let thisSCL: TokenizedString[] = [];
        while(!isNullOrUndefined(token) && !token.is_eof) {
            token = this.tokenizingTextContent.readNext();
            if (token.is_eof) {
                if (thisSCL.length > 0) {
                    if (match(thisSCL[0].value, "T_SET")) {
                        this.processSETSCL(thisSCL);
                        break;
                    }
                    // no need to wait for scls that are not a SET xxx
                    process.nextTick(this.dispatchSCL, thisSCL);
                }
                break;
            }
            thisSCL.push(token);

            if (token.is_eoStatement) {
                const sclToBeProcess = thisSCL;
                thisSCL = [];
                if (match(sclToBeProcess[0].value, "T_SET")) {
                    this.processSETSCL(sclToBeProcess);
                    continue;
                }
                // no need to wait for scls that are not a SET xxx
                process.nextTick(this.dispatchSCL, sclToBeProcess);
            }
        }
    }

    private processSETSCL(currSCL: TokenizedString[]) {
        // currSCL[0] is SET for sure

        if (currSCL.length < 2) {
            this.pushDiagnostic(DiagnosticSeverity.Error, currSCL[0],
                'SET should be followed by the following keywords: ACTION, BUILD, FROM, OPTIONS, STOPRC, TO, WHERE');
            return;
        }

        let i = 1;
        let token = currSCL[i];
        switch (true) {
            case match(token.value, "T_ACTION"):
                parseSetAction(this, currSCL, i);
                return;
            case match(token.value, "T_BUILD"):

                break;
            case match(token.value, "T_FROM"):

                break;
            case match(token.value, "T_OPTIONS"):

                break;
            case match(token.value, "T_STOPRC"):

                break;
            case match(token.value, "T_TO"):

                break;
            case match(token.value, "T_WHERE"):

                break;
            default:
                this.pushDiagnostic(DiagnosticSeverity.Error, token,
                    `Invalid keyword \"${token.value}\" specified after SET`,
                    'SET should be followed by the following keywords: ACTION, BUILD, FROM, OPTIONS, STOPRC, TO, WHERE');
                return;
        }
    }

    /**
     * Send the scl to its own syntax validate tree based on the first keyword.
     *
     * @param {TokenizedString[]} currSCL
     * @memberof SyntaxDiagnose
     */
    dispatchSCL = ((currSCL: TokenizedString[]) => {

    });

    /**
     * Get the diagnostic info and push it into this.diagnostics
     *
     * @param {DiagnosticSeverity} severity
     * @param {TokenizedString} token
     * @param {string} message
     * @param {string} [relatedMsg]
     * @memberof SyntaxDiagnose
     */
    public pushDiagnostic(severity: DiagnosticSeverity, token: TokenizedString, message: string, relatedMsg?: string) {
        let diagnostic: Diagnostic = {
            severity: severity,
            range: {
                start: this.textDocument.positionAt(token.startPos),
                end: this.textDocument.positionAt(token.startPos + token.value.length)
            },
            message: message,
            source: 'Endevor SCL extension'
        };
        if (this.hasDiagnosticRelatedInformationCapability && !isNullOrUndefined(relatedMsg)) {
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: this.textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: relatedMsg,
                }
            ];
        }
        this.diagnostics.push(diagnostic);
    }
}
