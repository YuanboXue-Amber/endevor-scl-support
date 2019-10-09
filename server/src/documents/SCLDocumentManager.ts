import {
    TextDocument,
    TextDocumentItem,
    VersionedTextDocumentIdentifier,
    TextDocumentContentChangeEvent,
    TextDocumentPositionParams,
    CompletionItem,
    TextDocumentIdentifier,
    TextEdit,
    CompletionItemKind} from "vscode-languageserver";
import { SCLDocument } from './SCLDocument';
import { isNull, isNullOrUndefined } from "util";

export interface IDocumentSettings {
    maxNumberOfProblems: number;
    isREST: boolean;
}

interface ICapabilities {
    hasDiagnosticRelatedInformationCapability: boolean;
}

export const actionCompletion = [ "SET", "ADD", "UPDATE", "DELETE", "GENERATE",
"MOVE", "RETRIEVE", "SIGNIN", "TRANSFER", "APPROVE", "DENY", "BACKIN",
"BACKOUT", "CAST", "DEFINE", "EXECUTE", "RESET", "COMMIT", "LIST"];

/**
 * Manage all the opened documents in the client
 *
 * @export
 * @class SCLDocumentManager
 */
export class SCLDocumentManager {
    static config: IDocumentSettings = { maxNumberOfProblems: 1000, isREST: false };
    static capabilities: ICapabilities = { hasDiagnosticRelatedInformationCapability: false };

    static numberOfProblems = 0; // TODO, now I'm accessing it from everywhere, not sure if it is the best

    // a map of document uri to document details
    documents: Map<string, SCLDocument> = new Map();

    constructor() {
        this.documents = new Map();
    }

    // NEVER USED
    openDocument(textDocumentItem: TextDocumentItem): SCLDocument {
        const textDocument: TextDocument = TextDocument.create(
            textDocumentItem.uri, textDocumentItem.languageId, textDocumentItem.version, textDocumentItem.text);
        const document: SCLDocument = new SCLDocument(textDocument);
        this.documents.set(textDocument.uri, document);

        // no need to refresh the diagnose number, since it is dealt with in SCLDocument.pushDiagnostic
        return document;
    }

    openOrChangeDocument(textDocument: TextDocument): SCLDocument {
        let document = this.documents.get(textDocument.uri);
        if (!document) {
            document = new SCLDocument(textDocument);
            this.documents.set(textDocument.uri, document);
            return document;
        }
        document.textDocument = textDocument;
        document.fullUpdate();
        this.documents.set(textDocument.uri, document);

        // no need to refresh the diagnose number, since it is dealt with in SCLDocument.pushDiagnostic
        return document;
    }

    closeDocument(textDocumentUri: string): void {
        const document = this.documents.get(textDocumentUri);
        if (isNullOrUndefined(document)) {
            return;
        }

        // refresh the diagnose number
        let decreaseNum = 0;
        document.statements.forEach((statement) => {
            decreaseNum += statement.diagnostics.length;
        });
        SCLDocumentManager.numberOfProblems = SCLDocumentManager.numberOfProblems - decreaseNum;
        if (SCLDocumentManager.numberOfProblems < 0) {
            SCLDocumentManager.numberOfProblems = 0;
        }

        this.documents.delete(textDocumentUri);
    }

    // NEVER USED
    updateDocument(
        textDocument: VersionedTextDocumentIdentifier,
        contentChanges: TextDocumentContentChangeEvent[]): SCLDocument {

        const document = this.documents.get(textDocument.uri);
        if (!document) {
            throw new Error(`Cannot update unopened document: ${textDocument.uri}`);
        }

        // When we get the TextDocumentContentChangeEvent[] from vscode, it is sorted.
        // The changes at the end of the document will be returned first.
        // This is really nice, because if we process changes in the beginning first,
        // then all indexes in scl statements will shift for changes after, and it is hard to deal with.
        // But since we get the change in the end first, and no matter how much the change shift the index of the content after it,
        // it won't affect the index of the scl statements before it, and therefore not affecting the changes in front.
        let originalContent = document.textDocument.getText();
        let newContent = originalContent;
        for (const change of contentChanges) {
            let start = 0;
            let end = 0;
            if (!change.range) {
                end = document.textDocument.getText().length;
            } else {
                start = document.textDocument.offsetAt(change.range.start);
                end = document.textDocument.offsetAt(change.range.end);
            }

            document.update(change.text, start, end, newContent);

            newContent = newContent.substring(0, start)
                            + change.text
                            + newContent.substring(end, newContent.length);
        }
        // refresh TextDocument after all changes are processed
        document.textDocument = TextDocument.create(
            document.textDocument.uri, document.textDocument.languageId,
            isNull(textDocument.version) ? document.textDocument.version : textDocument.version,
            newContent);

        // refresh the "range" in diagnose based on the new textDocument
        document.statements.forEach((statement) => {
            statement.diagnostics.forEach((diag) => {
                diag.diagnostic.range.start = document.textDocument.positionAt(diag.starti);
                diag.diagnostic.range.end = document.textDocument.positionAt(diag.endi);
            });
        });

        this.documents.set(textDocument.uri, document);

        // no need to refresh the diagnose number, since it is dealt with in SCLDocument.update and SCLDocument.pushDiagnostic
        return document;
    }

    getCompletionBySyntax(textDocumentPosition: TextDocumentPositionParams): CompletionItem[] {
        const document = this.documents.get(textDocumentPosition.textDocument.uri);
        if (!document) {
            throw new Error(`Cannot provide completion on unopened document: ${textDocumentPosition.textDocument.uri}`);
        }

        const tobeCompelteIndex = document.textDocument.offsetAt(textDocumentPosition.position);
        let completionItems: CompletionItem[] = [];

        for (const statement of document.statements) {
            if (tobeCompelteIndex >= statement.starti && tobeCompelteIndex <= statement.endi) {
                let i = -1;
                while (i < statement.tokens.length - 1) {
                    i ++;
                    const starti = statement.tokens[i].starti + statement.tokens[i].value.length;
                    const endi = (i+1) < statement.tokens.length ? statement.tokens[i+1].starti : statement.endi;

                    if (tobeCompelteIndex >= starti && tobeCompelteIndex <= endi) {
                        // to complete between tokens[i] and tokens[i+1] in scl
                        const values = statement.tokens[i].completionItems;
                        if (!isNullOrUndefined(values)) {
                            if (statement.tokens[i].value !== ".") {
                                completionItems = completionItems.concat(values);
                            } else {
                                for (const each of actionCompletion) {
                                    completionItems.push({
                                        label: each + " ",
                                        kind: CompletionItemKind.Function,
                                        documentation: "Endevor SCL keyword"
                                    });
                                }
                            }
                        }
                        return completionItems;
                    }
                }
            }
        }

        // to complete at the end of scl
        const statement = document.statements[document.statements.length-1];
        const values = statement.tokens[statement.tokens.length-1].completionItems;
        if (!isNullOrUndefined(values) && statement.tokens[statement.tokens.length-1].value !== ".") {
            completionItems = completionItems.concat(values);
        } else {
            // maybe a new scl is started
            for (const each of actionCompletion) {
                completionItems.push({
                    label: each + " ",
                    kind: CompletionItemKind.Function,
                    documentation: "Endevor SCL keyword"
                });
            }
        }
        return completionItems;
    }

    async formatDocument(textDocument: TextDocumentIdentifier): Promise<TextEdit[]> {
        const document = this.documents.get(textDocument.uri);
        if (!document) {
            throw new Error(`Cannot provide formatting on unopened document: ${textDocument.uri}`);
        }

        return document.formatDocument();
    }
}