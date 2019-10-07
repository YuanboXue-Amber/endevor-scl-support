import { Position } from 'vscode-languageserver';
import { SCLDocument } from '../../src/documents/SCLDocument';
import { prepareTrees } from '../../src/parser/syntaxTrees/PrepareTrees';

beforeAll(() => {
    prepareTrees();
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
            expect(statement.diagnostics).toMatchSnapshot();
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

describe("test3: Test 2 simple INvalid ADD ACTION", () => {
    it("Should have error", async () => {
        let sourceTextDocument: any = {
            getText() {
                return " ADD  ELEMENT element TO ENV OPTION \n new version 01 OPTION CCID .\n " +
                    "ADD  ELEMENT element TO ENV env1 SUBs sbs1 OPTION \n processor gro = 'group name'  .";
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

describe("test4: Test 1 valid ADD ACTION with multiple options", () => {
    it("Should have error", async () => {
        let sourceTextDocument: any = {
            getText() {
                return "ADD  ELEMENT element TO SUBs sbs1 ENV env1  OPTION \n processor gro = 'group name'  " +
                "OVErride SIGNOut CCID ccid . ";
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