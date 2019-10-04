import { isNullOrUndefined } from "util";
import { ITokenizedString } from "./Tokenizer";
import { DiagnosticSeverity } from "vscode-languageserver";
import { SCLDocument, SCLstatement } from "../documents/SCLDocument";
import { QUICKFIX_UPPERCASE_MSG } from "../codeActionProvider";

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
 * @param {ITokenizedString} inputSCLtoken the token to be matched, which is in statement
 * @param {string} parserTag field name in ParserTag classs, eg. T_ADD
 * @param {SCLstatement} statement the statement where keyword uppercase warning diagnose will be pushed to
 * @param {SCLDocument} document the document where statement is in
 * @returns {boolean} true only when the field match the keyword represent by parserTag
 */
export function match(
    inputSCLtoken: ITokenizedString,
    parserTag: string,
    statement: SCLstatement,
    document: SCLDocument ): boolean {

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
        keywordUppercaseDiagnose(inputSCLtoken, statement, document);
        return true;
    }
    return false;
}

/**
 * Push a warning to a keyword that is not uppercased
 *
 * @param {ITokenizedString} keywordInSource
 * @param {SCLstatement} statement
 * @param {SCLDocument} document
 */
function keywordUppercaseDiagnose(
    keywordInSource: ITokenizedString,
    statement: SCLstatement,
    document: SCLDocument) {

    if (keywordInSource.value.toUpperCase() !== keywordInSource.value) {
        document.pushDiagnostic(
            keywordInSource,
            statement,
            DiagnosticSeverity.Warning,
            QUICKFIX_UPPERCASE_MSG + '\nLowercased keyword might cause the scl action to fail when submitted',
            );
    }
}