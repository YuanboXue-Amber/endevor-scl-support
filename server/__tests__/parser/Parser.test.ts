import { prepareTrees, ADDtree, SETtree } from '../../src/parser/PreParserUtils';
import { Parser } from '../../src/parser/Parser';
import { Position } from 'vscode-languageserver';
import { Tokenizer, ITokenizedString } from '../../src/parser/Tokenizer';

prepareTrees();

const sclToToken = (sclInput: string): ITokenizedString[] => {
    const tokenizingTestFile: Tokenizer = new Tokenizer(sclInput);
    const result = [];
    let nextStr: ITokenizedString = tokenizingTestFile.readNext();
    result.push(nextStr);
    while(nextStr.value.length !== 0) {
        nextStr = tokenizingTestFile.readNext();
        result.push(nextStr);
    }
    return result;
};

describe("Test ", () => {
    const mockDocument: any = {
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

    it("ADD with no TYPE in TO, and too long SUB", async () => {
        const sclString = "    ADD ELEMENT 'PMOVE' FROM DSNAME 'BST.P7718.SOURCE'\r\n" +
        "          MEMBER 'PMOVE'\r\n TO ENVIRONMENT 'QA1'\r\n" +
        "  SYSTEM 'ECPLSYS'\r\n SUBSYSTEM 'ECPLSUBtoolong'   OPtION  CCID 'CCID'\r\n" +
        "                   comment \"Processor for testcase PROMOTION\"\r\n" +
        "    UPDATE UPDATE iF\r\n" +
        "                         .";
        const parseADD = new Parser(mockDocument, sclToToken(sclString), ADDtree);
        parseADD.parser();
        expect("Diagnoses: ").toMatchSnapshot();
        expect(parseADD.diagnoses).toMatchSnapshot();
        expect("All tokens: ").toMatchSnapshot();
        expect(parseADD.scl).toMatchSnapshot();
        expect("From memo: ").toMatchSnapshot();
        expect(parseADD.fromMemo).toMatchSnapshot();
        expect("To memo: ").toMatchSnapshot();
        expect(parseADD.toMemo).toMatchSnapshot();
    });


    it("An invalid set from", async () => {
        const sclString = "    SeT FROM STAGE 1 SYSTEM bla ENVIRONMENT blabla INVALID" +
        "                         .";
        const parseSET = new Parser(mockDocument, sclToToken(sclString), SETtree);
        parseSET.parser();
        expect("Diagnoses: ").toMatchSnapshot();
        expect(parseSET.diagnoses).toMatchSnapshot();
        expect("All tokens: ").toMatchSnapshot();
        expect(parseSET.scl).toMatchSnapshot();
        expect("From memo: ").toMatchSnapshot();
        expect(parseSET.fromMemo).toMatchSnapshot();
        expect("To memo: ").toMatchSnapshot();
        expect(parseSET.toMemo).toMatchSnapshot();
    });
});
