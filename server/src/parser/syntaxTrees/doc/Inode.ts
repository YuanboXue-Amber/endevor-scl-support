export interface ItreeNode {
    value: string;
    type: "keyword" | "value" | "eos";
    requireNext?: boolean;
    children: ItreeNode[];
    leftSibling?: ItreeNode;
    rightSibling?: ItreeNode;
    parent?: ItreeNode;
}

export interface Inode {
    value: string;
    type: "keyword" | "value" | "eos";
    next: Inode[];
    requireNext?: boolean;
}