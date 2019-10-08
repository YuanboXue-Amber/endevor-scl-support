import { isNullOrUndefined } from "util";
import { ParserTags } from './parser/parserTags';
import * as fs from 'fs';

const level0keywords: string[] = [
    ParserTags.SET,
    ParserTags.ADD,
    ParserTags.ARCHIVE,
    ParserTags.COPY,
    ParserTags.DELETE,
    ParserTags.GENERATE,
    ParserTags.LIST,
    ParserTags.MOVE,
    ParserTags.PRINT,
    ParserTags.RESTORE,
    ParserTags.RETRIEVE,
    ParserTags.SIGNIN,
    ParserTags.TRANSFER,
    ParserTags.UPDATE,
    ParserTags.VALIDATE,
    ParserTags.APPROVE,
    ParserTags.DENY,
    ParserTags.BACKIN,
    ParserTags.BACKOUT,
    ParserTags.CAST,
    ParserTags.DEFINE,
    ParserTags.EXECUTE,
    ParserTags.RESET,
    ParserTags.COMMIT
];

const level1keywords: string[] = [
    ParserTags.ACTION,
    ParserTags.BUILD,
    ParserTags.FROM,
    ParserTags.OPTION,
    ParserTags.TO,
    ParserTags.WHERE,
    ParserTags.STOPRC,
    ParserTags.ELEMENT,
    "THRough", "THRu",
    ParserTags.VERSION,
    ParserTags.LEVEL,
    ParserTags.PACKAGE,
    ParserTags.DATA,
];

const level2keywords: string[] = [
    ParserTags.FILE,
    ParserTags.DDNAME,
    ParserTags.DSNAME,
    ParserTags.PATH,
    ParserTags.MEMBER,
    ParserTags.USSFILE,

    ParserTags.ENVIRONMENT,
    ParserTags.SYSTEM,
    ParserTags.SUBSYSTEM,
    ParserTags.TYPE,
    ParserTags.STAGE,
    ParserTags.NUMBER,

    ParserTags.NOTES,
    ParserTags.STATEMENT,
    ParserTags.DESCRIPTION

    // ParserTags.UPDATE + " " + ParserTags.IF + " " + ParserTags.PRESENT,

    // ParserTags.CCID,
    // ParserTags.COMMENT,
    // ParserTags.NEW,
    // ParserTags.VERSION,
    // ParserTags.INPUT,
    // ParserTags.SOURCE,
    // ParserTags.OVERRIDE,
    // ParserTags.SIGNOUT,
    // ParserTags.BYPASS,
    // ParserTags.PROCESSOR,
    // ParserTags.GROUP,
    // ParserTags.EQUAL,
    // ParserTags.AUTOGEN,
    // ParserTags.SPAN,
    // ParserTags.NONE,
    // ParserTags.ALL,
];

// compose a regex from parsetag. Eg. for APPROVER it is APP(ROVER|ROVE|ROV|RO|R|\b)
const composeRegex = ((tagValue: string): string | undefined => {

    const kwMatchArray = tagValue.match(/([A-Z ]*)([a-zA-Z ]*)/);
    if (isNullOrUndefined(kwMatchArray)) {
        return undefined;
    }
    const mandatoryText = kwMatchArray[1];
    const optionalText = kwMatchArray[2].toUpperCase();

    let regexString = mandatoryText + "(";
    for (let i = optionalText.length; i > 0; -- i) {
        regexString += optionalText.substr(0, i) + "|";
    }
    regexString += "\\b)";
    return `\\b(${regexString})\\b`;
});

const jsonGenerator = (() => {
    const textMateJson: string = fs.readFileSync("./syntaxes/scl.tmLanguage.json", "UTF-8");
    const textMateObj = JSON.parse(textMateJson);
    textMateObj.repository.keywords2.patterns = [];
    textMateObj.repository.keywords1.patterns = [];
    textMateObj.repository.keywords0.patterns = [];

    level2keywords.forEach((kw) => {
        const regex = composeRegex(kw);
        if (isNullOrUndefined(regex))
            return;
        textMateObj.repository.keywords2.patterns.push({
            name: "support.variable.tertiarykeyword.scl",
            match: regex
        });
    });

    level1keywords.forEach((kw) => {
        const regex = composeRegex(kw);
        if (isNullOrUndefined(regex))
            return;
        textMateObj.repository.keywords1.patterns.push({
            name: "support.class.secondarykeyword.scl",
            match: regex
        });
    });

    level0keywords.forEach((kw) => {
        const regex = composeRegex(kw);
        if (isNullOrUndefined(regex))
            return;
        textMateObj.repository.keywords0.patterns.push({
            name: "keyword.control.scl",
            match: regex
        });
    });
    fs.writeFileSync("./syntaxes/scl.tmLanguage.json", JSON.stringify(textMateObj, null, 4), "UTF-8");
});

jsonGenerator();