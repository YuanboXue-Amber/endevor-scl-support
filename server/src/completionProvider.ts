import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { ParserTags } from './parser/parserTags';
import { isNullOrUndefined } from "util";

export function composeCompletionItemsFromKeywords(): CompletionItem[] {
    let completionItems: CompletionItem[] = [];

    Object.values(ParserTags).forEach((value) => {
        // key: the name of the object key
        // index: the ordinal position of the key within the object
        if (isNullOrUndefined(value)) {
            return;
        }
        completionItems.push({
            label: value.toUpperCase(),
            kind: CompletionItemKind.Text,
            documentation: "Endevor SCL keyword"
        });
    });
    return completionItems;
}