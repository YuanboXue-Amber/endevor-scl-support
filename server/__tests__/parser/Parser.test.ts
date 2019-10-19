import { prepareTrees, ADDtree, SETtree, GENERATEtree, DEFINEPACKAGEtree } from '../../src/parser/PreParserUtils';
import { Parser } from '../../src/parser/Parser';
import { Position } from 'vscode-languageserver';
import { Tokenizer, ITokenizedString } from '../../src/parser/Tokenizer';

prepareTrees();

const sclToToken = (sclInput: string): ITokenizedString[] => {
    const tokenizingTestFile: Tokenizer = new Tokenizer(sclInput);
    const result = [];
    let nextStr;
    while(true) {
        nextStr = tokenizingTestFile.readNext();
        if (nextStr.value.length === 0)
            break;
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
        "    UPDATE UPDATE iF.\r\n" +
        "                         ";
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
        "          .               ";
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

    it("An one word", async () => {
        const sclString = " GENERATE   ";
        const parse = new Parser(mockDocument, sclToToken(sclString), GENERATEtree);
        parse.parser();
        expect("Diagnoses: ").toMatchSnapshot();
        expect(parse.diagnoses).toMatchSnapshot();
        expect("All tokens: ").toMatchSnapshot();
        expect(parse.scl).toMatchSnapshot();
        expect("From memo: ").toMatchSnapshot();
        expect(parse.fromMemo).toMatchSnapshot();
        expect("To memo: ").toMatchSnapshot();
        expect(parse.toMemo).toMatchSnapshot();
    });

    it("Define pkg with notes", async () => {
        const sclString = "    DEFINE PACKAGE 'packageId'\r\n" +
        "DESCRIPTION 'package description'\r\n" +
        "    OPTION PROMOTION PACKAGE BACKOUT ENABLED SHARABLE PACKAGE NOTES ( 'sample note1' ,\r\n" +
        "            'sample n\"ote2' )\r\n" +
        ".";
        const parse = new Parser(mockDocument, sclToToken(sclString), DEFINEPACKAGEtree);
        parse.parser();
        expect("Diagnoses: ").toMatchSnapshot();
        expect(parse.diagnoses).toMatchSnapshot();
        expect("All tokens: ").toMatchSnapshot();
        expect(parse.scl).toMatchSnapshot();
        expect("From memo: ").toMatchSnapshot();
        expect(parse.fromMemo).toMatchSnapshot();
        expect("To memo: ").toMatchSnapshot();
        expect(parse.toMemo).toMatchSnapshot();
    });

    it("Generate with where clause", async () => {
        const sclString = "  GENERATE ELEMENT ELM THROUGH ELM2 WHERE CCID OF RETRIEVE = ( \"ccid1\", \"ccid2\", \"toolong ccid 3\") OPTION CCID Test .";
        const parse = new Parser(mockDocument, sclToToken(sclString), GENERATEtree);
        parse.parser();
        expect("Diagnoses: ").toMatchSnapshot();
        expect(parse.diagnoses).toMatchSnapshot();
        expect("All tokens: ").toMatchSnapshot();
        expect(parse.scl).toMatchSnapshot();
        expect("From memo: ").toMatchSnapshot();
        expect(parse.fromMemo).toMatchSnapshot();
        expect("To memo: ").toMatchSnapshot();
        expect(parse.toMemo).toMatchSnapshot();
    });

});
