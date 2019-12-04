import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { isNullOrUndefined } from "util";

export function composeCompletionItemsFromKeywords(): CompletionItem[] {
    let completionItems: CompletionItem[] = [];

    Object.values(ParserTags).forEach((value) => {
        // key: the name of the object key
        // index: the ordinal position of the key within the object
        if (isNullOrUndefined(value)) {
            return;
        }
        if (value.indexOf(",") > 0) {
            const values = value.split(", ");
            for (const v of values) {
                completionItems.push({
                    label: v.toUpperCase() + " ",
                    kind: CompletionItemKind.Keyword,
                    documentation: "Endevor SCL keyword"
                });
            }
            return;
        }
        completionItems.push({
            label: value.toUpperCase() + " ",
            kind: CompletionItemKind.Keyword,
            documentation: "Endevor SCL keyword"
        });
    });
    return completionItems;
}


export const ParserTags = {
    ACTION: "ACTion",
    ADD: "ADD",
    ARCHIVE: "ARChive",
    BUILD: "BUIld",
    COPY: "COPy",
    DDNAME: "DDName",
    DELETE: "DELete",
    DSNAME: "DSName",
    ELEMENT: "ELEments",
    ENVIRONMENT: "ENVironment",
    FILE: "FILe",
    FROM: "FROm",
    GENERATE: "GENerate",
    LIST: "LISt",
    MEMBER: "MEMber",
    MOVE: "MOVe",
    NUMBER: "NUMber",
    OPTION: "OPTions",
    PATH: "PATH",
    PRINT: "PRInt",
    RESTORE: "REStore",
    RETRIEVE: "RETrieve",
    SET: "SET",
    SIGNIN: "SIGnin",
    STAGE: "STAge",
    STOPRC: "STOprc",
    SUBSYSTEM: "SUBsystems",
    SYSTEM: "SYStems",
    THROUGH: "THRough, THRu",
    TRANSFER: "TRAnsfer",
    TO: "TO",
    TYPE: "TYPe",
    UPDATE: "UPDate",
    USSFILE: "USSFILE",
    VALIDATE: "VALidate",
    WHERE: "WHEre",
    CCID: "CCID",
    COMMENT: "COMments",
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

    SITE: "SITE",
    SYSOUT: "SYSOUT",
    C1PRINT: "C1PRINT",
    C1PRTVB: "C1PRTVB",

    OF: "OF",
    CURRENT: "CURrent",
    ONLY: "ONLy",
    COMPONENT: "COMPonent",

    COPYBACK: "COPyback",
    SEARCH: "SEArch",
    NOSEARCH: "NOSearch",
    NOSOURCE: "NOSOurce",

    SYNCHRONIZE: "SYNchronize",
    WITH: "WITh",
    HISTORY: "HIStory",
    RETAIN: "RETAin",
    JUMP: "JUMp",

    LEVEL: "LEVel",
    REPLACE: "REPlace",
    NO: "NO",
    EXPAND: "EXPand",
    INCLUDE: "include",

    IGNORE: "IGNore",
    FAILED: "failed",
    DUPLICATE: "DUPLICATE",
    OUTPUT: "output",
    CHECK: "check",

    APPROVE: "APPRove",
    PACKAGE: "PACkage",
    NOTES: "NOTEs",
    LEFTP: "(",
    RIGHTP: ")",
    COMMA: ",",
    DENY: "DENY",
    BACKIN: "BACKIn",
    BACKOUT: "BACKOut",
    STATEMENT: "STATEment",

    CAST: "CASt",
    IS: "IS",
    NOT: "NOT",
    ENABLED: "ENAbled",
    WARNING: "WARning",
    DO: "DO",
    EXECUTION: "EXECUTion",
    WINDOW: "WINdow",

    DEFINE: "DEFine",
    IMPORT: "IMPort",
    SCL: "SCL",
    APPEND: "APPEnd",
    DESCRIPTION: "DEScription",
    STANDARD: "STANdard",
    EMERGENCY: "EMErgency",
    NONSHARABLE: "NONsharable",
    SHARABLE: "SHArable",
    NONPROMOTION: "NONPromotion",
    PROMOTION: "PROMotion",
    OLDER: "OLDer",
    THAN: "THAn",
    DAYS: "DAYS",
    STATUS: "STATus",
    OR: "OR",
    ALLSTATE: "ALLstate",
    INEDIT: "INEdit",
    INAPPROVAL: "INApproval",
    DENIED: "DENied",
    APPROVED: "APPROVED",
    INEXECUTION: "INEXecution",
    EXECUTED: "EXECUTED",
    EXECFAILED: "EXECFailed",
    COMMITTED: "COMMITTEd",

    EXECUTE: "EXECUTE",
    RESET: "RESet",
    COMMIT: "COMMit",

    DELIMITERS: "DELImiters",
    NOCSV: "NOCsv",
    NOTITLE: "NOTitle",
    QUALIFIER: "QUAlifier",
    QUOTE: "QUOte",
    PHYSICAL: "PHYsical",
    LOGICAL: "LOGical",
    RETURN: "RETurn",
    FIRST: "FIRst",

    DATA: "DATa",
    BASIC: "BASic",
    CHANGE: "CHAnge",
    SUMMARY: "SUMmary",
    LAST: "LASt",
    THRU: "THRu",
    DATE: "DATE",
    TIME: "TIMe",

    ENTERPRISE: "ENTerprise",
    TARGET: "TARget",
    PACKAGETYPE: "S, E",
    ENTERPRISETYPE: "A, E, X",
    PKGACTIONTYPE: "CO, MO, CA, AP, EX, BO, BI, CO",
    PROMOTIONTYPE: "A, P, X",
    APPROVER: "APProver"
};