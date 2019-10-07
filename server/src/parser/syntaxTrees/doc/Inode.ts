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

export interface IFromTocheck {
    from: {
        FILE: boolean; // include FILE DDNAME DSNAME
        location: {
            ENVIRONMENT: boolean;
            SYSTEM: boolean;
            SUBSYSTEM: boolean;
            TYPE: boolean;
            STAGE: boolean;
        }
    };
    to: {
        FILE: boolean; // include FILE DDNAME DSNAME, SYSOUT/C1PRINT/C1PRTVB
        location: {
            ENVIRONMENT: boolean;
            SYSTEM: boolean;
            SUBSYSTEM: boolean;
            TYPE: boolean;
            STAGE: boolean;
        }
    };
}
