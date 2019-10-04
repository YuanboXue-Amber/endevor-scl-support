import { isNullOrUndefined } from "util";
import { ParserTags } from './parser/parserTags';
import * as fs from 'fs';

const level0keywords: string[] = [
    ParserTags.T_SET,
    ParserTags.T_ADD,
    ParserTags.T_ARCHIVE,
    ParserTags.T_COPY,
    ParserTags.T_DELETE,
    ParserTags.T_GENERATE,
    ParserTags.T_LIST,
    ParserTags.T_MOVE,
    ParserTags.T_PRINT,
    ParserTags.T_RESTORE,
    ParserTags.T_RETRIEVE,
    ParserTags.T_SIGNIN,
    ParserTags.T_TRANSFER,
    ParserTags.T_UPDATE,
    ParserTags.T_VALIDATE
];

const level1keywords: string[] = [
    ParserTags.T_ACTION,
    ParserTags.T_BUILD,
    ParserTags.T_FROM,
    ParserTags.T_OPTIONS,
    ParserTags.T_TO,
    ParserTags.T_WHERE,
    ParserTags.T_STOPRC,
    ParserTags.T_ELEMENT,
    ParserTags.T_THROUGH,
];

const level2keywords: string[] = [
    ParserTags.T_FILE,
    ParserTags.T_DDNAME,
    ParserTags.T_DSNAME,
    ParserTags.T_PATH,
    ParserTags.T_MEMBER,
    ParserTags.T_USSFILE,

    ParserTags.T_ENVIRONMENT,
    ParserTags.T_SYSTEM,
    ParserTags.T_SUBSYSTEM,
    ParserTags.T_TYPE,
    ParserTags.T_STAGE,
    ParserTags.T_NUMBER,
];

// compose a regex from parsetag. Eg. for T_APPROVER it is APP(ROVER|ROVE|ROV|RO|R|\b)
const composeRegex = ((tagValue: string): string | undefined => {

    const kwMatchArray = tagValue.match(/([A-Z]*)([a-zA-Z]*)/);
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
    const textMateJson: string = fs.readFileSync("./syntaxes/scl.tmLanguage.json", "UTF-8")
    const textMateObj = JSON.parse(textMateJson);
    textMateObj.repository.keywords.patterns = [];

    level0keywords.forEach((kw) => {
        const regex = composeRegex(kw);
        if (isNullOrUndefined(regex))
            return;
        textMateObj.repository.keywords.patterns.push({
            name: "keyword.control.scl",
            match: regex
        });
    });

    level1keywords.forEach((kw) => {
        const regex = composeRegex(kw);
        if (isNullOrUndefined(regex))
            return;
        textMateObj.repository.keywords.patterns.push({
            name: "support.class.secondarykeyword.scl",
            match: regex
        });
    });

    level2keywords.forEach((kw) => {
        const regex = composeRegex(kw);
        if (isNullOrUndefined(regex))
            return;
        textMateObj.repository.keywords.patterns.push({
            name: "support.variable.tertiarykeyword.scl",
            match: regex
        });
    });
    fs.writeFileSync("./syntaxes/scl.tmLanguage.json", JSON.stringify(textMateObj, null, 4), "UTF-8");
});

jsonGenerator();