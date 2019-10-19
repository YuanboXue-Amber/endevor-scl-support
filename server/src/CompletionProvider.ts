import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { ParserTags } from './oldParser/ParserTags';
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