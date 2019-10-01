import { isNullOrUndefined } from "util";
import { TokenizedString } from "./tokenizer";
import { SyntaxDiagnose } from "./syntaxDiagnose";
import { DiagnosticSeverity } from "vscode-languageserver";

export const ParserTags = {
    T_ACTION: "ACTion",
    T_ADD: "ADD",
    T_ARCHIVE: "ARChive",
    T_BUILD: "BUIld",
    T_COPY: "COPy",
    T_DELETE: "DELete",
    T_FROM: "FROm",
    T_GENERATE: "GENerate",
    T_LIST: "LISt",
    T_MOVE: "MOVe",
    T_OPTIONS: "OPTions",
    T_PRINT: "PRInt",
    T_RESTORE: "REStore",
    T_RETRIEVE: "RETrieve",
    T_SET: "SET",
    T_SIGNIN: "SIGnin",
    T_STOPRC: "STOprc",
    T_TRANSFER: "TRAnsfer",
    T_TO: "TO",
    T_UPDATE: "UPDate",
    T_VALIDATE: "VALidate",
    T_WHERE: "WHEre",
};

/**
 * Get field value based on field name
 *
 * @param {string} tag field name in ParserTag classs, eg. T_ADD
 * @returns {(string | undefined)}
 */
function getString(tag: string): string | undefined {
    const descriptor = Object.getOwnPropertyDescriptor(ParserTags, tag);
    if (isNullOrUndefined(descriptor)) {
        return undefined;
    }
    return descriptor.value;
}

/**
 * Match an input scl piece to a keyword specified by parserTag.
 * When matched, perform a syntax diagnose on if the keyword is uppercased or not
 *
 * @export
 * @param {TokenizedString} inputSCLtoken
 * @param {string} parserTag field name in ParserTag classs, eg. T_ADD
 * @returns {boolean} true only when the field match the keyword represent by parserTag
 * @returns {boolean}
 */
export function match(
    inputSCLtoken: TokenizedString, parserTag: string, syntaxDiagnoseObj: SyntaxDiagnose): boolean {

    const inputSCLpart = inputSCLtoken.value;
    let keyword = getString(parserTag);
    if (isNullOrUndefined(keyword)) {
        return false;
    }
    const kwMatchArray = keyword.match(/([A-Z]*)([a-zA-Z]*)/);
    if (isNullOrUndefined(kwMatchArray)) {
        return false;
    }
    const mandatoryText = kwMatchArray[1];
    const optionalText = kwMatchArray[2].toUpperCase();

    const sclkey = inputSCLpart.trim().toUpperCase();
    if (!sclkey.startsWith(mandatoryText)) {
        return false;
    }

    // compose a regex from parsetag. Eg. for T_APPROVER it is APP(ROVER|ROVE|ROV|RO|R|\b)
    const composeRegex = ((mandatoryText: string, optionalText: string) => {
        let regexString = mandatoryText + "(";
        for (let i = optionalText.length; i > 0; -- i) {
            regexString += optionalText.substr(0, i) + "|";
        }
        regexString += "\\b)";
        return regexString;
    });
    const regex = new RegExp(composeRegex(mandatoryText, optionalText));
    const textMatchArray = sclkey.match(regex);
    if (!isNullOrUndefined(textMatchArray) && textMatchArray[0] === sclkey) {
        keywordUppercaseDiagnose(inputSCLtoken, syntaxDiagnoseObj);
        return true;
    }
    return false;
}

export const QUICKFIXMSG = `Keyword should be uppercased`;

/**
 * Push a warning to a keyword that is not uppercased
 *
 * @param {TokenizedString} keywordInSource
 * @param {SyntaxDiagnose} syntaxDiagnoseObj
 */
function keywordUppercaseDiagnose(keywordInSource: TokenizedString, syntaxDiagnoseObj: SyntaxDiagnose) {
    if (keywordInSource.value.toUpperCase() !== keywordInSource.value) {
        syntaxDiagnoseObj.pushDiagnostic(DiagnosticSeverity.Warning, keywordInSource,
            QUICKFIXMSG,
            'Lowercased keyword might cause the scl action to fail when submitted');
    }
}