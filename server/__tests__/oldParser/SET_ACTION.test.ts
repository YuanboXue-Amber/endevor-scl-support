import { Position } from 'vscode-languageserver';
import { SCLDocument } from '../../src/documents/SCLDocument';
import { SCLDocumentManager } from '../../src/documents/SCLDocumentManager';
import { prepareTrees } from '../../src/oldParser/syntaxTrees/PrepareTrees';

beforeAll(() => {
    prepareTrees();
});

describe("test1: Test 1 simple valid SET ACTION", () => {
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

describe("test2: Test 3 simple valid SET ACTION", () => {
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

describe("test3: Test 4 simple INvalid SET ACTION", () => {
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

describe("test4: Test 2 simple INvalid SET ACTION, with lowercased keyword", () => {
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