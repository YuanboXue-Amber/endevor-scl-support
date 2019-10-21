import {
    TextDocument,
    TextDocumentItem,
    VersionedTextDocumentIdentifier,
    TextDocumentContentChangeEvent,
    TextDocumentPositionParams,
    CompletionItem,
    TextDocumentIdentifier,
    TextEdit,
    CompletionItemKind,
    Position, Range,
    Command,
    CodeLens,
    ExecuteCommandParams} from "vscode-languageserver";
import { SCLDocument } from './SCLDocument';
import { isNull, isNullOrUndefined } from "util";
import { isUnaryLike } from "@babel/types";
import { commands, executeSubmitSCL } from "../ExecuteCommandProvider";

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

    static numberOfProblems = 0;

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

        // reset the diagnose number
        let decreaseNum = 0;
        document.statements.forEach((statement) => {
            decreaseNum += statement.diagnostics.length;
        });
        SCLDocumentManager.numberOfProblems = SCLDocumentManager.numberOfProblems - decreaseNum;
        if (SCLDocumentManager.numberOfProblems < 0) {
            SCLDocumentManager.numberOfProblems = 0;
        }

        document.textDocument = textDocument;
        document.fullUpdate();
        this.documents.set(textDocument.uri, document);

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
        let values;
        if (!isNullOrUndefined(statement))
            values = statement.tokens[statement.tokens.length-1].completionItems;
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

    async computeCodeLenses(textDocument: TextDocumentIdentifier): Promise<CodeLens[]> {
        const document = this.documents.get(textDocument.uri);
        if (!document) {
            throw new Error(`Cannot provide codeLens on unopened document: ${textDocument.uri}`);
        }

        let codeLens: CodeLens[] = [];
        for (const statement of document.statements) {
            const range = {
                start: document.textDocument.positionAt(statement.starti),
                end: document.textDocument.positionAt(statement.starti+1),
            };
            codeLens = codeLens.concat(
                commands.map(command => ({
                    range,
                    command: Command.create(command.title, command.command, textDocument, range)
                }))
            );
        }
        return codeLens;
    }

    async executeCodeLens(params: ExecuteCommandParams) {
        const textDocument: TextDocumentIdentifier = (params.arguments as any[])[0];
        const range: Range = (params.arguments as any[])[1];
        const document = this.documents.get(textDocument.uri);
        if (!document) {
            throw new Error(`Cannot provide codeLens on unopened document: ${textDocument.uri}`);
        }
        return executeSubmitSCL(document, document.textDocument.offsetAt(range.start));
    }

}