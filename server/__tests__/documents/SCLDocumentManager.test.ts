import { SCLDocumentManager } from '../../src/documents/SCLDocumentManager';
import { TextDocumentItem, VersionedTextDocumentIdentifier, TextDocumentContentChangeEvent } from 'vscode-languageserver';
import { SCLDocument } from '../../src/documents/SCLDocument';

describe("Test", () => {

    it("test1: open document", async () => {

        const openedDocument: TextDocumentItem = {
            uri: "mocked/uri",
            languageId: "mocklanguageId",
            version: 1,
            text: "SET action add . \n SET ACTION RESTORE. \n Set INvalid. "
        };
        const manager = new SCLDocumentManager();
        const document: SCLDocument = manager.openDocument(openedDocument);
        expect(document.textDocument.getText()).toMatchSnapshot();
        for (const statement of document.statements) {
            expect(statement.tokens).toMatchSnapshot();
            expect(statement.starti).toMatchSnapshot();
            expect(statement.endi).toMatchSnapshot();
            expect(statement.diagnostics).toMatchSnapshot();
        }
    });

    it("test2: update document", async () => {

        const updatedDocumentId: VersionedTextDocumentIdentifier = {
            uri: "mocked/uri",
            version: 1
        };

        const contentChanges: TextDocumentContentChangeEvent[] = [
            {
                // substitude at the end
                range: {
                    start: {
                        line: 2,
                        character: 5
                    },
                    end: {
                        line: 2,
                        character: 12
                    }
                },
                rangeLength: 1,
                text: "ACTION TRANSFER "
            },
            {
                // change the line ending after "SET ACTION RESTORE. "
                range: {
                    start: {
                        line: 1,
                        character: 21
                    },
                    end: {
                        line: 1,
                        character: 22
                    }
                },
                rangeLength: 1,
                text: "."
            },
            {
                // insert word SET at the beginning
                range: {
                    start: {
                        line: 0,
                        character: 0
                    },
                    end: {
                        line: 0,
                        character: 0
                    }
                },
                rangeLength: 0,
                text: "SET"
            }
        ];

        const openedDocument: TextDocumentItem = {
            uri: "mocked/uri",
            languageId: "mocklanguageId",
            version: 1,
            text: "SET action add . \n SET ACTION RESTORE. \n Set INvalid. "
        };
        const manager = new SCLDocumentManager();
        manager.openDocument(openedDocument);
        const document: SCLDocument = manager.updateDocument(updatedDocumentId, contentChanges);
        expect(document.textDocument.getText()).toMatchSnapshot();
        for (const statement of document.statements) {
            expect(statement.tokens).toMatchSnapshot();
            expect(statement.starti).toMatchSnapshot();
            expect(statement.endi).toMatchSnapshot();
            expect(statement.diagnostics).toMatchSnapshot();
        }
    });

    it("test3: update document", async () => {

        const updatedDocumentId: VersionedTextDocumentIdentifier = {
            uri: "mocked/uri",
            version: 1
        };

        const contentChanges: TextDocumentContentChangeEvent[] = [
            {
                // insert at the end
                range: {
                    start: {
                        line: 4,
                        character: 1
                    },
                    end: {
                        line: 4,
                        character: 1
                    }
                },
                rangeLength: 0,
                text: " SET ACTION transfer ."
            },
            {
                // remove the line ending after "SET ACTION RESTORE. "
                range: {
                    start: {
                        line: 2,
                        character: 17
                    },
                    end: {
                        line: 2,
                        character: 18
                    }
                },
                rangeLength: 1,
                text: ""
            },
            {
                // remove SET.
                range: {
                    start: {
                        line: 1,
                        character: 6
                    },
                    end: {
                        line: 1,
                        character: 10
                    }
                },
                rangeLength: 4,
                text: ""
            },
            {
                // substitude action \nadd to action DELETE
                range: {
                    start: {
                        line: 0,
                        character: 4
                    },
                    end: {
                        line: 1,
                        character: 3
                    }
                },
                rangeLength: 11,
                text: "action DELETE"
            }
        ];

        const openedDocument: TextDocumentItem = {
            uri: "mocked/uri",
            languageId: "mocklanguageId",
            version: 1,
            text: "SET action \nadd . SET. SET \n ACTION RESTORE. \n Set ACTION invalid\n. "
        };
        const manager = new SCLDocumentManager();
        manager.openDocument(openedDocument);
        const document: SCLDocument = manager.updateDocument(updatedDocumentId, contentChanges);
        expect(document.textDocument.getText()).toMatchSnapshot();
        for (const statement of document.statements) {
            expect(statement.tokens).toMatchSnapshot();
            expect(statement.starti).toMatchSnapshot();
            expect(statement.endi).toMatchSnapshot();
            expect(statement.diagnostics).toMatchSnapshot();
        }
    });

    it("test4: close document", async () => {

        const openedDocument: TextDocumentItem = {
            uri: "mocked/uri",
            languageId: "mocklanguageId",
            version: 1,
            text: "SET action \nadd . SET. SET \n ACTION RESTORE. \n Set ACTION invalid\n. "
        };
        const manager = new SCLDocumentManager();
        const document = manager.openDocument(openedDocument);
        expect(document.textDocument.getText()).toMatchSnapshot();

        manager.closeDocument(openedDocument.uri);
        expect(manager.documents.size).toBe(0);
    });

    it("test5: update document", async () => {

        const updatedDocumentId: VersionedTextDocumentIdentifier = {
            uri: "mocked/uri",
            version: 1
        };

        const contentChanges: TextDocumentContentChangeEvent[] = [
            {
                // insert at the end
                range: {
                    start: {
                        line: 0,
                        character: 21
                    },
                    end: {
                        line: 0,
                        character: 21
                    }
                },
                rangeLength: 0,
                text: "ACTION TRANSFER ."
            }
        ];

        const openedDocument: TextDocumentItem = {
            uri: "mocked/uri",
            languageId: "mocklanguageId",
            version: 1,
            text: "SET action add . SET "
        };
        const manager = new SCLDocumentManager();
        manager.openDocument(openedDocument);
        const document: SCLDocument = manager.updateDocument(updatedDocumentId, contentChanges);
        expect(document.textDocument.getText()).toMatchSnapshot();
        for (const statement of document.statements) {
            expect(statement.tokens).toMatchSnapshot();
            expect(statement.starti).toMatchSnapshot();
            expect(statement.endi).toMatchSnapshot();
            expect(statement.diagnostics).toMatchSnapshot();
        }
    });

});