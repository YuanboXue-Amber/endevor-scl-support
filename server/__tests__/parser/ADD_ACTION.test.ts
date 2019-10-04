import { Position } from 'vscode-languageserver';
import { SCLDocument } from '../../src/documents/SCLDocument';
import { SCLDocumentManager } from '../../src/documents/SCLDocumentManager';
import { prepareADDtree, ADDtree } from '../../src/parser/syntaxTrees/PrepareTrees';

beforeAll(() => {
    prepareADDtree();
});

describe("Test if the tree is prepared", () => {
    it("", async () => {
        expect(ADDtree).toMatchSnapshot();
    });
});

describe("test1: Test 1 simple valid ADD ACTION", () => {
    it("Should have no error", async () => {
        let sourceTextDocument: any = {
            getText() {
                return " ADD  ELEMENT element FROM DSNAME test . ";
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
            expect(statement.diagnostics.length).toBe(0);
        }
    });
});

describe("test2: Test 1 simple INvalid ADD ACTION", () => {
    it("Should have error", async () => {
        let sourceTextDocument: any = {
            getText() {
                return " ADD  ELEMENT element FROM DSNAME test OPTION CCID . ";
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
