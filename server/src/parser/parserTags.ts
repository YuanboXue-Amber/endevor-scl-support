import { isNullOrUndefined } from "util";

export const ParserTags = {
    getString(tag: string): string | undefined {
        const descriptor = Object.getOwnPropertyDescriptor(ParserTags, tag);
        if (isNullOrUndefined(descriptor)) {
            return undefined;
        }
        return descriptor.value;
    },
    T_ACTION: "ACTion",
    T_ADD: "ADD",
    T_ARCHIVE: "ARChive",
    T_SET: "SET",
};