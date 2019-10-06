import { isNullOrUndefined } from "util";
import { ITokenizedString } from "./Tokenizer";
import { DiagnosticSeverity } from "vscode-languageserver";
import { SCLDocument, SCLstatement } from "../documents/SCLDocument";
import { QUICKFIX_UPPERCASE_MSG } from "../codeActionProvider";

export const ParserTags = {
    ACTION: "ACTion",
    ADD: "ADD",
    ARCHIVE: "ARChive",
    BUILD: "BUIld",
    COPY: "COPy",
    DDNAME: "DDName",
    DELETE: "DELete",
    DSNAME: "DSName",
    ELEMENT: "ELEment",
    ENVIRONMENT: "ENVironment",
    FILE: "FILe",
    FROM: "FROm",
    GENERATE: "GENerate",
    LIST: "LISt",
    MEMBER: "MEMber",
    MOVE: "MOVe",
    NUMBER: "NUMber",
    OPTIONS: "OPTions",
    OPTION: "OPTion",
    PATH: "PATH",
    PRINT: "PRInt",
    RESTORE: "REStore",
    RETRIEVE: "RETrieve",
    SET: "SET",
    SIGNIN: "SIGnin",
    STAGE: "STAge",
    STOPRC: "STOprc",
    SUBSYSTEM: "SUBSystem",
    SYSTEM: "SYStem",
    THROUGH: "THRough",
    TRANSFER: "TRAnsfer",
    TO: "TO",
    TYPE: "TYPe",
    UPDATE: "UPDate",
    USSFILE: "USSFILE",
    VALIDATE: "VALidate",
    WHERE: "WHEre",
    CCID: "CCID",
    COMMENT: "COMment",
    NEW: "NEW",
    VERSION: "VERsion",
    IF: "if",
    PRESENT: "present",
    INPUT: "input",
    SOURCE: "source",
    OVERRIDE: "OVErride",
    SIGNOUT: "SIGNOut",
    BYPASS: "BYPass",
    PROCESSOR: "PROcessor",
    GROUP: "GROup",
    EQUAL: "EQual",
    EQUALSIGN: "=",
    AUTOGEN: "AUTogen",
    SPAN: "SPAN",
    NONE: "NONe",
    ALL: "ALL",
    SYSTEMS: "SYStems",
    SUBSYSTEMS: "Subsystems",
};

/**
 * Get field value based on field name
 *
 * @param {string} tag field name in ParserTag classs, eg. ADD
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
 *
 * Match an input scl piece to a keyword specified by parserTag.
 *
 * @export
 * @param {ITokenizedString} inputSCLtoken
 * @param {string} parserTag
 * @returns {boolean} true when match false not
 */
export function matchWithoutDiagnose(
    inputSCLtoken: ITokenizedString,
    parserTag: string): boolean {

    const inputSCLpart = inputSCLtoken.value;
    let keyword = getString(parserTag);
    if (isNullOrUndefined(keyword)) {
        return false;
    }

    // might be operator
    if (keyword === inputSCLtoken.value) {
        return true;
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

    // compose a regex from parsetag. Eg. for APPROVER it is APP(ROVER|ROVE|ROV|RO|R|\b)
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
        return true;
    }
    return false;
}

/**
 * Match an input scl piece to a keyword specified by parserTag.
 * When matched, perform a syntax diagnose on if the keyword is uppercased or not
 *
 * @export
 * @param {ITokenizedString} inputSCLtoken the token to be matched, which is in statement
 * @param {string} parserTag field name in ParserTag classs, eg. ADD
 * @param {SCLstatement} statement Only changed when return true: the statement where keyword uppercase warning diagnose will be pushed to
 * @param {SCLDocument} document Only changed when return true: the document where statement is in
 * @returns {boolean} true only when the field match the keyword represent by parserTag
 */
export function match(
    inputSCLtoken: ITokenizedString,
    parserTag: string,
    statement: SCLstatement,
    document: SCLDocument ): boolean {

    const ismatch = matchWithoutDiagnose(inputSCLtoken, parserTag);
    if (ismatch) {
        keywordUppercaseDiagnose(inputSCLtoken, statement, document);
    }
    return ismatch;
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