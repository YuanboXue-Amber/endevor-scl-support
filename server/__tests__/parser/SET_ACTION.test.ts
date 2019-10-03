import { Position } from 'vscode-languageserver';
import { SCLDocument } from '../../src/documents/SCLDocument';
import { SCLDocumentManager } from '../../src/documents/SCLDocumentManager';

describe("Test a simple valid SET ACTION", () => {
    it("Should have no error", async () => {
        let sourceTextDocument: any = {
            getText() {
                return " SET ACTION VALIDATE . ";
            },
            uri: "mocked/uri"
        };

        const document: SCLDocument = new SCLDocument(sourceTextDocument);
        for (const statement of document.statements) {
            expect(statement.diagnostics.length).toBe(0);
        }
    });
});

describe("Test 3 simple valid SET ACTION", () => {
    it("Should have no error", async () => {
        let sourceTextDocument: any = {
            getText() {
                return " SET ACTION VALIDATE . \n      SET ACTION ADD . \nSET ACTION TRA . ";
            },
            uri: "mocked/uri"
        };

        const document: SCLDocument = new SCLDocument(sourceTextDocument);
        for (const statement of document.statements) {
            expect(statement.diagnostics.length).toBe(0);
        }
    });
});

SCLDocumentManager.capabilities.hasDiagnosticRelatedInformationCapability = true;

describe("Test 4 simple INvalid SET ACTION", () => {
    it("Should have error", async () => {
        let sourceTextDocument: any = {
            getText() {
                return " SET ACTION INVALID . SET \n  . SET ACTION RES. SET ACTION ADD";
            },
            positionAt(offset: number): Position {
                expect(offset).toMatchSnapshot();
                const mockPosition: Position = {
                    line: 1,
                    character: 2
                };
                return mockPosition;
            },
            uri: "mocked/uri"
        };

        const document: SCLDocument = new SCLDocument(sourceTextDocument);
        for (const statement of document.statements) {
            expect(statement.diagnostics).toMatchSnapshot();
        }
    });
});

describe("Test 2 simple INvalid SET ACTION, with lowercased keyword", () => {
    it("Should have error", async () => {
        let sourceTextDocument: any = {
            getText() {
                return " SET ACTION res . SET ACTiON invalid";
            },
            positionAt(offset: number): Position {
                expect(offset).toMatchSnapshot();
                const mockPosition: Position = {
                    line: 1,
                    character: 2
                };
                return mockPosition;
            },
            uri: "mocked/uri"
        };

        const document: SCLDocument = new SCLDocument(sourceTextDocument);
        for (const statement of document.statements) {
            expect(statement.diagnostics).toMatchSnapshot();
        }
    });
});