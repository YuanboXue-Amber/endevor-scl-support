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
}

export let SETtree: Inode;
export let ADDtree: Inode;
export let GENERATEtree: Inode;
export let DEFINEPACKAGEtree: Inode;

export function prepareTrees() {
    SETtree = composeTreeFromJSON(prepareJSON("SETtree.json"));
    ADDtree = composeTreeFromJSON(prepareJSON("ADDtree.json"));
    GENERATEtree = composeTreeFromJSON(prepareJSON("GENERATEtree.json"));
    DEFINEPACKAGEtree = composeTreeFromJSON(prepareJSON("DEFINEPACKAGEtree.json"));
}

function prepareJSON(jsonFileName: string): Inode {
    const jsonPath = path.resolve(__dirname, "../newParser/syntaxTrees/"+ jsonFileName);
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

function dispatcher(scl: ITokenizedString[]): Inode | undefined {
    if (scl.length >= 2) {
        switch (true) {
            case match(scl[0].value, "ADD"):
                return ADDtree;
            case match(scl[0].value, "GENerate"):
                return GENERATEtree;
            case match(scl[0].value, "DEFine"):
                return DEFINEPACKAGEtree;
            case match(scl[0].value, "SET"):
                return SETtree;
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
