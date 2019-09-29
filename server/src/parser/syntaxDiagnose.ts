import { TextDocument, Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { defaultSettings } from "../server";
import { TokenizedString, Tokenizer } from "./tokenizer";
import { ParserTags } from "./parserTags";
import { isNullOrUndefined } from "util";

export async function validateTextDocument(
    textDocument: TextDocument, hasDiagnosticRelatedInformationCapability: boolean):
    Promise<{ uri: string; diagnostics: Diagnostic[]; }> {

    let text: string = textDocument.getText();

    let nextStr: TokenizedString = {
        value: "",
        startPos: 0,
        is_word: false,
        is_keyword: false,
        is_op_char: false,
        is_eoStatement: false,
        is_eof: false
    };
    const tokenizingTextContent: Tokenizer = new Tokenizer(text);
    const firstWord = tokenizingTextContent.readNext();

    let problems = 0;
    let diagnostics: Diagnostic[] = [];

    let pattern = /\b[A-Z]{2,}\b/g;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) && problems < defaultSettings.maxNumberOfProblems) {
        problems++;
        let diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Warning,
            range: {
                start: textDocument.positionAt(m.index),
                end: textDocument.positionAt(m.index + m[0].length)
            },
            message: `${m[0]} is all uppercase.`,
            source: 'ex'
        };
        if (hasDiagnosticRelatedInformationCapability) {
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: 'Spelling matters'
                },
                {
                    location: {
                        uri: textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: 'Particularly for names'
                }
            ];
        }
        diagnostics.push(diagnostic);
    }

    return { uri: textDocument.uri, diagnostics };
}

/**
 * Match an input scl piece to a keyword specified by parserTag
 *
 * @param {string} inputSCLpart
 * @param {string} parserTag field name in ParserTag classs, eg. T_ADD
 * @returns
 */
function match(inputSCLpart: string, parserTag: string) {
    let keyword = ParserTags.getString(parserTag);
    if (isNullOrUndefined(keyword)) {
        return false;
    }
    const kwMatchArray = keyword.match(/([A-Z]*)([a-zA-Z]*)/);
    if (isNullOrUndefined(kwMatchArray)) {
        return false;
    }
    const mandatoryText = kwMatchArray[1];
    const optionalText = kwMatchArray[2].toUpperCase();

    const sclkey = inputSCLpart.trim().toUpperCase();
    if (!sclkey.startsWith(mandatoryText)) {
        return false;
    }

    // compose a regex from parsetag. Eg. for T_APPROVER it is APP(ROVER|ROVE|ROV|RO|R|\b)
    const composeRegex = ((mandatoryText: string, optionalText: string) => {
        let regexString = mandatoryText + "(";
        for (let i = optionalText.length; i > 0; -- i) {
            regexString += optionalText.substr(0, i) + "|";
        }
        regexString += "\\b)";
        return regexString;
    });
    const regex = new RegExp(composeRegex(mandatoryText, optionalText));
    const textMatchArray = sclkey.match(regex);
    if (!isNullOrUndefined(textMatchArray) && textMatchArray[0] === sclkey) {
        return true;
    }
    return false;
}

export function testSETSyntaxTree(
    textDocument: TextDocument, hasDiagnosticRelatedInformationCapability: boolean):
    { uri: string; diagnostics: Diagnostic[]; } {

    let diagnostics: Diagnostic[] = [];

    const tokenizingTextContent: Tokenizer = new Tokenizer(textDocument.getText());
    let token = tokenizingTextContent.peekNext();

    if (match(token.value, "T_SET")) {
        tokenizingTextContent.readNext();
        token = tokenizingTextContent.peekNext();

        if (match(token.value, "T_ACTION")) {
            tokenizingTextContent.readNext();
            token = tokenizingTextContent.peekNext();

            if (match(token.value, "T_ADD")) {
                tokenizingTextContent.readNext();
                token = tokenizingTextContent.peekNext();

                if (token.is_eoStatement) {
                    tokenizingTextContent.readNext();
                    token = tokenizingTextContent.peekNext();

                    if (token.is_eof) {
                        // finish
                    } else {
                        // next statement
                    }

                } else{}

            } else if (match(token.value, "T_ARCHIVE")) {
                tokenizingTextContent.readNext();
                token = tokenizingTextContent.peekNext();

                if (token.is_eoStatement) {
                    tokenizingTextContent.readNext();
                    token = tokenizingTextContent.peekNext();

                    if (token.is_eof) {
                        // finish
                    } else {
                        // next statement
                    }

                } else{}

            } else {
                let diagnostic: Diagnostic = {
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: textDocument.positionAt(token.startPos),
                        end: textDocument.positionAt(token.startPos + token.value.length)
                    },
                    message: `ambertest msg`,
                    source: 'ambertest'
                };
                if (hasDiagnosticRelatedInformationCapability) {
                    diagnostic.relatedInformation = [
                        {
                            location: {
                                uri: textDocument.uri,
                                range: Object.assign({}, diagnostic.range)
                            },
                            message: 'ambertest relate msg'
                        }
                    ];
                }
                diagnostics.push(diagnostic);
            }
        } else {}
    } else {}

    return { uri: textDocument.uri, diagnostics };
}