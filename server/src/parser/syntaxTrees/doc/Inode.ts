export interface Inode {
    value: string;
    type: "keyword" | "value" | "eos";
    next: Inode[];
}