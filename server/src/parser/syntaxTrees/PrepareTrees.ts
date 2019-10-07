import { Inode, ItreeNode } from './doc/Inode';
import path = require('path');
import fs = require('fs');
import { isNullOrUndefined } from "util";

export let SETtree: ItreeNode;
export let ADDtree: ItreeNode;
export let UPDATEtree: ItreeNode;
export let DELETEtree: ItreeNode;
export let GENERATEtree: ItreeNode;
export let MOVEtree: ItreeNode;

export function prepareTrees() {
    SETtree = composeTreeFromJSON(prepareJSON("SETtree.json"));
    ADDtree = composeTreeFromJSON(prepareJSON("ADDtree.json"));
    UPDATEtree = composeTreeFromJSON(prepareJSON("UPDATEtree.json"));
    DELETEtree = composeTreeFromJSON(prepareJSON("DELETEtree.json"));
    GENERATEtree = composeTreeFromJSON(prepareJSON("GENERATEtree.json"));
    MOVEtree = composeTreeFromJSON(prepareJSON("MOVEtree.json"));
}

export function composeTreeFromJSON(jsonRootNode: Inode):ItreeNode {
    const rootNode: ItreeNode = {
        value: jsonRootNode.value,
        type: jsonRootNode.type,
        requireNext: jsonRootNode.requireNext,
        children: []
    };

    const createChildTree = (jsonParentNode: Inode, jsonParentTreeNode: ItreeNode) => {
        let leftTreeNode: ItreeNode;
        jsonParentNode.next.forEach((childNode) => {
            let node: ItreeNode = {
                value: childNode.value,
                type: childNode.type,
                requireNext: childNode.requireNext,
                children: [],
                parent: jsonParentTreeNode
            };
            if (isNullOrUndefined(leftTreeNode)) {
                jsonParentTreeNode.children.push(node);
                createChildTree(childNode, node);
            } else {
                node.leftSibling = leftTreeNode;
                jsonParentTreeNode.children.push(node);
                createChildTree(childNode, node);
                leftTreeNode.rightSibling = node;
            }
            leftTreeNode = node;
        });
    };

    createChildTree(jsonRootNode, rootNode);
    return rootNode;
}

export function prepareJSON(jsonFileName: string): Inode {
    const jsonPath = path.resolve(__dirname, "../syntaxTrees/"+ jsonFileName);
    const jsonStr = fs.readFileSync(jsonPath, "UTF-8");
    return JSON.parse(jsonStr);
}


