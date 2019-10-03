import { SCLDocumentManager } from '../../src/documents/SCLDocumentManager';
import { TextDocumentItem, TextDocumentContentChangeEvent, CompletionItem, TextDocumentPositionParams } from 'vscode-languageserver';
import { SCLDocument } from '../../src/documents/SCLDocument';

describe("Test", () => {

    it("test1: getCompletionBySyntax", async () => {

        const openedDocument: TextDocumentItem = {
            uri: "mocked/uri",
            languageId: "mocklanguageId",
            version: 1,
            text: "SET action add . \n SET ACTION RESTORE. \n Set INvalid. "
        };
        const manager = new SCLDocumentManager();
        const document: SCLDocument = manager.openDocument(openedDocument);
        expect(document.textDocument.getText()).toMatch(openedDocument.text);

        const textDocumentPosition: TextDocumentPositionParams = {
            textDocument: {
                uri: openedDocument.uri
            },
            position: {
                line: 2,
                character: 5
            }
        };
        const completions: CompletionItem[] = manager.getCompletionBySyntax(textDocumentPosition);
        expect(completions).toMatchSnapshot();
    });

    it("test2: getCompletionBySyntax", async () => {

        const openedDocument: TextDocumentItem = {
            uri: "mocked/uri",
            languageId: "mocklanguageId",
            version: 1,
            text: "SET action  . \n SET ACTION RESTORE. \n Set  "
        };
        const manager = new SCLDocumentManager();
        const document: SCLDocument = manager.openDocument(openedDocument);
        expect(document.textDocument.getText()).toMatch(openedDocument.text);

        const textDocumentPosition: TextDocumentPositionParams = {
            textDocument: {
                uri: openedDocument.uri
            },
            position: {
                line: 2,
                character: 6
            }
        };
        const completions: CompletionItem[] = manager.getCompletionBySyntax(textDocumentPosition);
        expect(completions).toMatchSnapshot();

        const textDocumentPosition2: TextDocumentPositionParams = {
            textDocument: {
                uri: openedDocument.uri
            },
            position: {
                line: 0,
                character: 11
            }
        };
        const completions2: CompletionItem[] = manager.getCompletionBySyntax(textDocumentPosition2);
        expect(completions2).toMatchSnapshot();
    });

});