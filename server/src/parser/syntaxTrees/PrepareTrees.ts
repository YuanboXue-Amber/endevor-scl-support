import { Inode } from './doc/Inode';
import path = require('path');
import fs = require('fs');
import { isNullOrUndefined } from "util";

export let SETtree: Inode;
export let ADDtree: Inode;

export function prepareTrees() {
    if (!prepareSETtree()) {
        throw new Error("Server cannot prepare syntax tree for SET");
    }
    if (!prepareADDtree()) {
        throw new Error("Server cannot prepare syntax tree for ADD");
    }
}

export function prepareSETtree(): boolean {
    const treeJSONPath = path.resolve(__dirname, "../syntaxTrees/SETtree.json");
    const treeJSON = fs.readFileSync(treeJSONPath, "UTF-8");
    SETtree = JSON.parse(treeJSON);
    if (isNullOrUndefined(SETtree) || isNullOrUndefined(SETtree.value)) {
        return false;
    }
    return true;
}

export function prepareADDtree(): boolean {
    const treeJSONPath = path.resolve(__dirname, "../syntaxTrees/ADDtree.json");
    const treeJSON = fs.readFileSync(treeJSONPath, "UTF-8");
    ADDtree = JSON.parse(treeJSON);
    if (isNullOrUndefined(ADDtree) || isNullOrUndefined(ADDtree.value)) {
        return false;
    }
    return true;
}

