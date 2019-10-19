import path = require('path');
import fs = require('fs');
import { isNullOrUndefined } from 'util';
import { ITokenizedString } from './Tokenizer';

export interface Inode {
    keyword?: string; // for keywords, if multiple, separated by comma
    maxLen?: number; // for value
    required?: boolean;
    isFROM?: boolean;
    isTO?: boolean;
    next?: Inode[];
    nogoback?: boolean; // when traverse on nodes, don't check this node
    specialValue?: boolean; // values in (,). Note all maxLen 255 and 768 are automaticaly special values,
    dateTimeValue?: boolean; // value with date time format
    parent?: Inode;

    requireNext?: boolean; // require child to be specified
}

export let SETtree: Inode;
export let ADDtree: Inode;
export let GENERATEtree: Inode;
export let DEFINEPACKAGEtree: Inode;

export let UPDATEtree: Inode;
export let DELETEtree: Inode;
export let MOVEtree: Inode;
export let RETRIEVEtree: Inode;
export let SIGNINtree: Inode;
export let TRANSFERtree: Inode;
export let APPROVEtree: Inode;
export let DENYtree: Inode;
export let BACKINtree: Inode;
export let BACKOUTtree: Inode;
export let CASTtree: Inode;
export let EXECUTEtree: Inode;
export let RESETtree: Inode;
export let COMMITtree: Inode;
export let LISTtree: Inode;

export function prepareTrees() {
    SETtree = composeTreeFromJSON(prepareJSON("SETtree.json"));
    ADDtree = composeTreeFromJSON(prepareJSON("ADDtree.json"));
    GENERATEtree = composeTreeFromJSON(prepareJSON("GENERATEtree.json"));
    DEFINEPACKAGEtree = composeTreeFromJSON(prepareJSON("DEFINEPACKAGEtree.json"));
    APPROVEtree = composeTreeFromJSON(prepareJSON("APPROVEtree.json"));
    DENYtree = composeTreeFromJSON(prepareJSON("DENYtree.json"));
    BACKINtree = composeTreeFromJSON(prepareJSON("BACKINtree.json"));
    BACKOUTtree = composeTreeFromJSON(prepareJSON("BACKOUTtree.json"));
    CASTtree = composeTreeFromJSON(prepareJSON("CASTtree.json"));
    DEFINEPACKAGEtree = composeTreeFromJSON(prepareJSON("DEFINEPACKAGEtree.json"));
    EXECUTEtree = composeTreeFromJSON(prepareJSON("EXECUTEtree.json"));
    RESETtree = composeTreeFromJSON(prepareJSON("RESETtree.json"));
    COMMITtree = composeTreeFromJSON(prepareJSON("COMMITtree.json"));
    UPDATEtree = composeTreeFromJSON(prepareJSON("UPDATEtree.json"));
    DELETEtree = composeTreeFromJSON(prepareJSON("DELETEtree.json"));
    MOVEtree = composeTreeFromJSON(prepareJSON("MOVEtree.json"));
    RETRIEVEtree = composeTreeFromJSON(prepareJSON("RETRIEVEtree.json"));
    SIGNINtree = composeTreeFromJSON(prepareJSON("SIGNINtree.json"));
    TRANSFERtree = composeTreeFromJSON(prepareJSON("TRANSFERtree.json"));
    LISTtree = composeTreeFromJSON(prepareJSON("LISTtree.json"));
}

function prepareJSON(jsonFileName: string): Inode {
    const jsonPath = path.resolve(__dirname, "../parser/syntaxTrees/"+ jsonFileName);
    const jsonStr = fs.readFileSync(jsonPath, "UTF-8");
    return JSON.parse(jsonStr);
}

function composeTreeFromJSON(jsonRootNode: Inode): Inode {
    const fillInParent = (jsonParentNode: Inode) => {
        if (isNullOrUndefined(jsonParentNode.next))
            return;

        jsonParentNode.next.forEach((childNode) => {
            childNode.parent = jsonParentNode;
            fillInParent(childNode);
        });
    };

    fillInParent(jsonRootNode);
    return jsonRootNode;
}

export function dispatcher(scl: ITokenizedString[]): Inode | undefined {
    if (scl.length >= 1) {
        switch (true) {
            case match(scl[0].value, "ADD"):
                return ADDtree;
            case match(scl[0].value, "GENerate"):
                return GENERATEtree;
            case match(scl[0].value, "DEFine"):
                return DEFINEPACKAGEtree;
            case match(scl[0].value, "SET"):
                return SETtree;
            case match(scl[0].value, "APPRove"):
                return APPROVEtree;
            case match(scl[0].value, "BACKIn"):
                return BACKINtree;
            case match(scl[0].value, "BACKOut"):
                return BACKOUTtree;
            case match(scl[0].value, "CASt"):
                return CASTtree;
            case match(scl[0].value, "COMMit"):
                return COMMITtree;
            case match(scl[0].value, "DENY"):
                return DENYtree;
            case match(scl[0].value, "EXECUTE"):
                return EXECUTEtree;
            case match(scl[0].value, "RESet"):
                return RESETtree;
            case match(scl[0].value, "DELete"):
                return DELETEtree;
            case match(scl[0].value, "LISt"):
                return LISTtree;
            case match(scl[0].value, "UPDate"):
                return UPDATEtree;
            case match(scl[0].value, "MOVe"):
                return MOVEtree;
            case match(scl[0].value, "RETrieve"):
                return RETRIEVEtree;
            case match(scl[0].value, "SIGnin"):
                return SIGNINtree;
            case match(scl[0].value, "TRAnsfer"):
                return TRANSFERtree;
            default:
                break;
        }
    }
    return undefined;
}

export function match(wordToMatch: string, pattern: string) {
    if (wordToMatch.toUpperCase() === pattern.toUpperCase()) {
        return true;
    }

    const kwMatchArray = pattern.match(/([A-Z]*)([a-zA-Z]*)/);
    if (isNullOrUndefined(kwMatchArray)) {
        return false;
    }
    const mandatoryText = kwMatchArray[1];
    const optionalText = kwMatchArray[2].toUpperCase();

    const sclkey = wordToMatch.trim().toUpperCase();
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
