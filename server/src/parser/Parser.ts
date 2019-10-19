import { isNullOrUndefined } from 'util';
import { ITokenizedString } from './Tokenizer';
import { Diagnostic, TextDocument, DiagnosticSeverity, CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { Inode, match } from './PreParserUtils';
import { QUICKFIX_UPPERCASE_MSG, QUICKFIX_CHOICE_MSG, QUICKFIX_NO_EOS_MSG, QUICKFIX_SPACE_BEFORE_EOS_MSG } from '../CodeActionProvider';
import { SCLDocumentManager } from '../documents/SCLDocumentManager';
import { EventEmitter } from 'events';

const DIAGNOSTICEVENT = "new diagnostic";
const KEYWORDMATCHEVENT = "check case and completion items";
const VALUEMATCHEVENT = "check completion items";
const POSTPROCESSEVENT = "set diagnose for eos";

export class Parser {
    document: TextDocument; // used for convering index with position
    diagnoses: Diagnostic[] = [];
    scl: ITokenizedString[] = [];
    private index: number = 1;
    private rootNode: Inode;

    fromMemo: string[] = [];
    toMemo: string[] = [];

    baseIndention: number = 4;

    private eventEmitter = new ParserEvent(this);

    constructor(document: TextDocument, scl: ITokenizedString[], rootNode: Inode) {
        this.document = document;
        this.diagnoses = [];
        this.scl = scl;
        this.index = 1;
        this.rootNode = rootNode;

        this.fromMemo = [];
        this.toMemo = [];

        this.baseIndention = 0;

        this.eventEmitter = new ParserEvent(this);
        this.eventEmitter.on(DIAGNOSTICEVENT, this.eventEmitter.addDiagnostic);
        this.eventEmitter.on(KEYWORDMATCHEVENT, this.eventEmitter.postKeywordMatch);
        this.eventEmitter.on(VALUEMATCHEVENT, this.eventEmitter.postValueMatch);
        this.eventEmitter.on(POSTPROCESSEVENT, this.eventEmitter.processEOS);
    }

    /**
     * Set diagnose when a keyword/value is not valid.
     * Check the completion item 1 position before indexOfErr, if there is any, then set related information in diagnose.
     *
     * @private
     * @param {number} indexOfErr
     * @memberof Parser
     */
    private setDiagnosticForInvalidValues(indexOfErr: number) {
        // set diagnostic
        if (indexOfErr-1 >= 0 && !isNullOrUndefined(this.scl[indexOfErr-1].completionItems) &&
            (this.scl[indexOfErr-1].completionItems as CompletionItem[]).length > 0) {
            const possibleValues: string[] = [];
            for (const item of this.scl[indexOfErr-1].completionItems as CompletionItem[]) {
                possibleValues.push(item.label);
            }
            this.eventEmitter.emit(DIAGNOSTICEVENT,
                this.scl[indexOfErr].starti, this.scl[indexOfErr].starti + this.scl[indexOfErr].value.length,
                DiagnosticSeverity.Error, `Invalid word`,
                this.scl[indexOfErr-1].starti,  this.scl[indexOfErr-1].starti + this.scl[indexOfErr-1].value.length,
                `${QUICKFIX_CHOICE_MSG}${possibleValues.join(", ")}`);

        } else {
            this.eventEmitter.emit(DIAGNOSTICEVENT,
                this.scl[indexOfErr].starti, this.scl[indexOfErr].starti + this.scl[indexOfErr].value.length,
                DiagnosticSeverity.Error, `Invalid word`);
        }
    }

    parser() {
        const matchNext = (parentNode: Inode, matchInAncestor?: boolean) => {
            if (this.index >= this.scl.length || this.scl[this.index].value === "") {
                if (!isNullOrUndefined(parentNode.next) &&
                    parentNode.next.length >= 1 && parentNode.next[0].required) { // incomplete scl
                    this.setDiagnosticForInvalidValues(this.scl.length-1);
                }
                return;
            }

            let matchFound = false;
            if (!isNullOrUndefined(parentNode.next)) {
                for (const nodeToBeMatch of parentNode.next) {
                    if (!isNullOrUndefined(nodeToBeMatch.keyword)) {
                        const result = this.dealWithKeyword(nodeToBeMatch);
                        if (result.errorFound)
                            return;
                        if (!result.isMatch)
                            continue;
                        matchFound = true;
                        matchNext(nodeToBeMatch);
                        break;
                    }
                    else if (!isNullOrUndefined(nodeToBeMatch.maxLen)) { // note, value's indention is \n+this.baseindetion of spaces
                        const result = this.dealWithValue(nodeToBeMatch);
                        if (result.errorFound)
                            return;
                        if (!result.isMatch)
                            continue;
                        matchFound = true;
                        matchNext(nodeToBeMatch);
                        break;
                    }
                    else if (!isNullOrUndefined(nodeToBeMatch.dateTimeValue)) {
                        const result = this.dealWithDateTimeValue(nodeToBeMatch);
                        if (result.errorFound)
                            return;
                        if (!result.isMatch)
                            continue;
                        matchFound = true;
                        matchNext(nodeToBeMatch);
                        break;
                    }
                }
            }
            // no match found, must be a keyword
            if (!matchFound) {
                if (!matchInAncestor && parentNode.requireNext) { // error
                    this.setDiagnosticForInvalidValues(this.index);
                    return;
                } else {
                    // try to go up in parents, to find a parent that has keyword child node, and call matchNext with that parent
                    let ancestor = parentNode.parent;
                    while (!isNullOrUndefined(ancestor)) {
                        let ancestorHasKeywordChild = 0;
                        // ancestor has child and more than 1
                        if (!isNullOrUndefined(ancestor.next)) {
                            for (const potentialMatch of ancestor.next) {
                                if (potentialMatch.keyword) {
                                    ancestorHasKeywordChild ++;
                                    if (potentialMatch.keyword.indexOf(", ") > 0)
                                        ancestorHasKeywordChild ++;
                                }
                                if (ancestorHasKeywordChild > 1)
                                    break;
                            }
                        }
                        if (ancestorHasKeywordChild > 1) {
                            matchNext(ancestor, true);
                            break;
                        }
                        if (ancestor.nogoback) { // no need to check up for more parents
                            break;
                        }
                        ancestor = ancestor.parent;
                    }
                }
            }
        };

        // for root, set case-diagnose and completion items
        this.eventEmitter.emit(KEYWORDMATCHEVENT, 0, 1, (this.rootNode.keyword as string), this.rootNode);
        // match root
        matchNext(this.rootNode);
        if (this.index < this.scl.length-1 && this.scl[this.index].value !== "") { // end before the whole scl is processed
            this.setDiagnosticForInvalidValues(this.index);
        }
        this.eventEmitter.emit(POSTPROCESSEVENT);
    }

    private dealWithKeyword(node: Inode): ParseResult {

        const keyphraseMatch = (keyphrase: string): boolean => {
            const keywords = keyphrase.split(/\s+/);
            let i = 0;
            for (i = 0; i < keywords.length; ++ i) {
                if (this.index + i >= this.scl.length) {
                    if (keywords[i].toLowerCase() !== keywords[i]) {
                        return false; // there's a compulsory doesn't get matched
                    } else {
                        break; // matched i-1 keywords
                    }
                }
                if (!match(this.scl[this.index+i].value, keywords[i])) {
                    if (keywords[i] === "." || keywords[i] === "=" || keywords[i].toLowerCase() !== keywords[i]) {
                        return false; // there's a compulsory doesn't get matched
                    } else {
                        break; // matched i-1 keywords
                    }
                }
            }
            // match found, set case-diagnose and completion items
            this.eventEmitter.emit(KEYWORDMATCHEVENT, this.index, i, keyphrase, node);
            this.index = this.index + i; // set index to the next position to be matched
            return true;
        };

        let result: ParseResult = {
            isMatch: false,
            errorFound: false
        };

        const keyphrases: string[] = (node.keyword as string).split(", ");
        for (const keyphrase of keyphrases) {
            if (keyphraseMatch(keyphrase)) {
                result.isMatch = true;
                return result; // index is already increased
            }
        }
        // not match
        if (node.required) {
            result.errorFound = true;
            this.setDiagnosticForInvalidValues(this.index);
        }
        // error/not match: no need to increase index
        return result;
    }

    private dealWithValue(node: Inode): ParseResult {
        let result: ParseResult = {
            isMatch: false,
            errorFound: false
        };

        // case 1 deal with special value
        const strip = (rawStr: string): string => {
            if (rawStr.startsWith("("))
                rawStr = rawStr.substring(1, rawStr.length);
            if (rawStr.endsWith(")"))
                rawStr = rawStr.substring(0, rawStr.length-1);
            else if (rawStr.endsWith(","))
                rawStr = rawStr.substring(0, rawStr.length-1);
            if (rawStr.startsWith("\"") && rawStr.endsWith("\""))
                rawStr = rawStr.substring(1, rawStr.length-1);
            else if (rawStr.startsWith("'") && rawStr.endsWith("'"))
                rawStr = rawStr.substring(1, rawStr.length-1);
            return rawStr;
        };

        // case 1.1 special value that is long name support
        let plus = 0;
        if (!node.specialValue && (node.maxLen as number) >= 255 && // long value expected
            (this.scl[this.index].value.endsWith(",") || (this.index+1 < this.scl.length && this.scl[this.index].value === ",") ) ) { // value is special

            let finalvalue = "";
            let startQuote = this.scl[this.index].value[0];
            while(true) {
                if (this.index+plus >= this.scl.length) { // bad scl ending
                    // diagnostic will be set when check for eos
                    result.errorFound = true;
                    return result; // error/not match: no need to increase index
                }
                const token = this.scl[this.index+plus];
                if (!token.value.endsWith(",") && !token.value.endsWith(startQuote)) {
                    break;  // current token is not a value anymore, it is the next keyword after value
                }
                finalvalue = finalvalue + strip(token.value);
                plus ++;
            }
            if (finalvalue.length <= 0 || finalvalue.length > (node.maxLen as number)) {
                // set diagnostic
                this.eventEmitter.emit(DIAGNOSTICEVENT,
                    this.scl[this.index].starti, this.scl[this.index+plus].starti + this.scl[this.index+plus].value.length,
                    DiagnosticSeverity.Error, `Expecting a value no longer than ${node.maxLen}. Current value has length ${finalvalue.length}`);
                // it is an error but it probably don't affect the other part of the scl. So we don't set result as error here.
            }
            result.isMatch = true;
            this.index = this.index+plus;
            this.eventEmitter.emit(VALUEMATCHEVENT, this.index-1, node);
            return result;
        }

        // case 1.2 special value that is a special value
        else if (node.specialValue && // special value expected
            (this.scl[this.index].value.startsWith("(") ||
             this.scl[this.index].value.endsWith(",") ||
             (this.index+1 < this.scl.length && this.scl[this.index].value === ",") ) ) { // value is special

            let finalvalue = "";
            while(true) {
                if (this.index+plus >= this.scl.length) { // bad scl ending
                    this.eventEmitter.emit(DIAGNOSTICEVENT,
                        this.scl[this.scl.length-1].starti, this.scl[this.scl.length-1].starti + this.scl[this.scl.length-1].value.length,
                        DiagnosticSeverity.Error, `No ")" found to enclose the value`);
                    result.errorFound = true;
                    return result; // error/not match: no need to increase index
                }
                const token = this.scl[this.index+plus];
                finalvalue = strip(token.value);
                if (token.value.length > 1 &&
                    (finalvalue.length <= 0 || finalvalue.length > (node.maxLen as number))) {
                    // set diagnostic
                    this.eventEmitter.emit(DIAGNOSTICEVENT,
                        token.starti, token.starti + token.value.length,
                        DiagnosticSeverity.Error,
                        `Expecting a value no longer than ${node.maxLen}. Current value has length ${finalvalue.length}`);
                    // it is an error but it probably don't affect the other part of the scl. So we don't set result as error here.
                }
                if (token.value.endsWith(")")) {
                    break; // current token is the last part of the special value
                }
                plus ++;
            }
            result.isMatch = true;
            this.index = this.index+plus+1;
            this.eventEmitter.emit(VALUEMATCHEVENT, this.index-1, node);
            return result;
        } // else it is not a special long name, let case 2 deal with it

        // case 2, it is not expecting a special value, or it is but the value is not special :)
        const valueLen = strip(this.scl[this.index].value).length;
        if (!this.scl[this.index].is_eoStatement) {
            if (valueLen <= 0 || valueLen > (node.maxLen as number)) {
                // set diagnostic
                this.eventEmitter.emit(DIAGNOSTICEVENT,
                    this.scl[this.index].starti, this.scl[this.index].starti + this.scl[this.index].value.length,
                    DiagnosticSeverity.Error,
                    `Expecting a value of length between 1 to ${node.maxLen}. Current value has length ${valueLen}`);
                // it is an error but it probably don't affect the other part of the scl. So we don't set result as error here.
            }
            result.isMatch = true;
            this.index = this.index + 1;
            this.eventEmitter.emit(VALUEMATCHEVENT, this.index-1, node);
            return result;
        } else {
            // set diagnostic
            this.eventEmitter.emit(DIAGNOSTICEVENT,
                this.scl[this.index].starti, this.scl[this.index].starti + this.scl[this.index].value.length,
                DiagnosticSeverity.Error,
                `Expecting a value no longer than ${node.maxLen} instead of an end-of-statement operator "."`);
            result.errorFound = true;
            return result; // error/not match: no need to increase index
        }
    }

    private dealWithDateTimeValue(node: Inode): ParseResult {
        let result: ParseResult = {
            isMatch: false,
            errorFound: false
        };
        if (this.scl.length <= this.index+1) {
            result.errorFound = true;
            return result; // error/not match: no need to increase index
        }
        // format has to be DDMMMYY HH:MM
        const dateStr: string = this.scl[this.index].value + " " + this.scl[this.index+1].value;
        if (dateStr.match(/^(([0-9])|([0-2][0-9])|([3][0-1]))([A-Za-z]{3})\d{2}(\s+)((0[0-9]|1[0-9]|2[0-3]|[0-9]):[0-5][0-9])$/)) {
            result.isMatch = true;
            this.index = this.index + 2;
            this.eventEmitter.emit(VALUEMATCHEVENT, this.index-1, node);
            return result;
        }
        // set diagnostic
        this.eventEmitter.emit(DIAGNOSTICEVENT,
            this.scl[this.index].starti, this.scl[this.index].starti + this.scl[this.index].value.length,
            DiagnosticSeverity.Error,
            `Expecting a value in DDMMMYY HH:MM format, for example 01JAN93 00:01`);
        result.errorFound = true;
        return result; // error/not match: no need to increase index
    }
}

class ParserEvent extends EventEmitter {
    parser: Parser;

    constructor(parser: Parser) {
        super();
        this.parser = parser;
    }

    /**
     * Only add diagnostic when it is within SCLDocumentManager.config.maxNumberOfProblems
     *
     * @param {number} startIndex
     * @param {number} endIndex
     * @param {DiagnosticSeverity} severity
     * @param {string} message
     * @param {number} [relatedStartIndex]
     * @param {number} [relatedEndIndex]
     * @param {string} [relatedMsg]
     * @returns
     * @memberof ParserEvent
     */
    async addDiagnostic(
        startIndex: number,
        endIndex: number,
        severity: DiagnosticSeverity,
        message: string,
        relatedStartIndex?: number,
        relatedEndIndex?: number,
        relatedMsg?: string,
        ) {

        if (SCLDocumentManager.numberOfProblems >= SCLDocumentManager.config.maxNumberOfProblems) {
            return;
        }
        if (startIndex < this.parser.scl[0].starti ||
            endIndex > this.parser.scl[this.parser.scl.length-1].starti+this.parser.scl[this.parser.scl.length-1].value.length) {
            // The error is not in the scl!!
            return;
        }

        SCLDocumentManager.numberOfProblems ++;

        let diagnostic: Diagnostic = {
            severity: severity,
            range: {
                start: this.parser.document.positionAt(startIndex),
                end: this.parser.document.positionAt(endIndex)
            },
            message: message,
            source: 'Endevor SCL extension'
        };
        if (SCLDocumentManager.capabilities.hasDiagnosticRelatedInformationCapability &&
            !isNullOrUndefined(relatedMsg) && !isNullOrUndefined(relatedStartIndex) && !isNullOrUndefined(relatedEndIndex)) {
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: this.parser.document.uri,
                        range: {
                            start: this.parser.document.positionAt(relatedStartIndex),
                            end: this.parser.document.positionAt(relatedEndIndex),
                        }
                    },
                    message: relatedMsg,
                }
            ];
        }
        this.parser.diagnoses.push(diagnostic);
    }

    postKeywordMatch(startindex: number, numberOfkeywords: number, keyphrase: string, matchingNode: Inode) {
        // match found, set case-diagnose and completion items
        this.uppercaseDiagnoseForKeyword(startindex, startindex+numberOfkeywords-1);
        this.setCompletionItemForKeyword(startindex+numberOfkeywords-1, matchingNode);
        // set from/to memo
        if (!isNullOrUndefined(matchingNode.parent)) {
            if (matchingNode.parent.isFROM)
                this.parser.fromMemo.push(keyphrase);
            else if (matchingNode.parent.isTO)
                this.parser.toMemo.push(keyphrase);
        }
        // set indention
        const keyword = matchingNode.keyword as string;
        if (matchingNode.isFROM || matchingNode.isTO ||
            keyword === "OPTion" || keyword.startsWith("WHEre ") || keyword === "THRough, THRu") {
            // reset the indention of the value before from/to/option
            this.parser.scl[startindex - 1].rightDistance = "\n" + " ".repeat(10 - this.parser.scl[startindex].value.length);
            this.parser.baseIndention = 11; // set new indention for other values
        } else if (keyphrase.indexOf(" ") > 0) { // a multi keywords phrase, line break afterwards
            this.parser.scl[startindex + numberOfkeywords - 1].rightDistance = "\n" + (" ".repeat(this.parser.baseIndention));
        }
    }

    postValueMatch(lastindex: number, matchingNode: Inode) {
        // match found, set case-diagnose and completion items
        this.setCompletionItemForValue(lastindex, matchingNode);
        // set indention
        this.parser.scl[lastindex].rightDistance = "\n" + (" ".repeat(this.parser.baseIndention));
    }

    private async uppercaseDiagnoseForKeyword(startIndex: number, lastIndex: number) {
        for (let i = startIndex; i <= lastIndex; ++ i) {
            if (this.parser.scl[i].value !== this.parser.scl[i].value.toUpperCase()) {
                this.emit(DIAGNOSTICEVENT,
                    this.parser.scl[i].starti, this.parser.scl[i].starti + this.parser.scl[i].value.length,
                    DiagnosticSeverity.Warning,
                    `${QUICKFIX_UPPERCASE_MSG}\nLowercased keyword might cause the scl action to fail when submitted`);
            }
        }
    }

    /**
     * Set completionItem for keyword.
     *
     * @private
     * @param {number} lastIndex the last index of a set of matching tokens.
     * For example, for "OVERRIDE SIGNOUT", we only set completion for "SIGNOUT"
     * @param {Inode} matchingNode
     * @memberof ParserEvent
     */
    private async setCompletionItemForKeyword(lastIndex: number, matchingNode: Inode) {
        // 1st check child
        const result: [CompletionItem[], boolean] = this.setCompletionItemFromChild(matchingNode);
        this.parser.scl[lastIndex].completionItems = result[0];
        if (result[1])
            return;

        // 2nd check all parents only for OPTIONS
        if (!isNullOrUndefined(matchingNode.parent) &&
        !isNullOrUndefined(matchingNode.parent.keyword) &&
        matchingNode.parent.keyword.toUpperCase() === "OPTION") {
            const resultFromParent = this.setCompletionItemFromParent(matchingNode);
            resultFromParent.forEach((item) => {
                (this.parser.scl[lastIndex].completionItems as CompletionItem[]).push(item);
            });
        }
    }

    /**
     * Set completionItem for value. Check all the ancestors it has
     *
     * @private
     * @param {number} lastIndex
     * @param {Inode} matchingNode
     * @returns
     * @memberof ParserEvent
     */
    private async setCompletionItemForValue(lastIndex: number, matchingNode: Inode) {
        // 1st check child
        const result: [CompletionItem[], boolean] = this.setCompletionItemFromChild(matchingNode);
        this.parser.scl[lastIndex].completionItems = result[0];
        if (result[1])
            return;

        // 2nd check all parents
        const resultFromParent = this.setCompletionItemFromParent(matchingNode);
        resultFromParent.forEach((item) => {
            (this.parser.scl[lastIndex].completionItems as CompletionItem[]).push(item);
        });
    }

    /**
     * Check compeltion item from child node of matchingNode, return an array.
     * array[1] is true means the end of completion item process, the caller should return
     *
     * @private
     * @param {Inode} matchingNode
     * @returns {[CompletionItem[], boolean]}
     * @memberof ParserEvent
     */
    private setCompletionItemFromChild(matchingNode: Inode): [CompletionItem[], boolean] {
        const result = [];
        if (!isNullOrUndefined(matchingNode.next)) {
            if (matchingNode.next.length === 1 && matchingNode.next[0].required) {
                // only child and required
                if (matchingNode.next[0].keyword) {
                    const phrases = matchingNode.next[0].keyword.split(", ");
                    for (const phrase of phrases) {
                        const item: CompletionItem = {
                            label: phrase.toUpperCase() + " ",
                            kind: CompletionItemKind.Keyword,
                            documentation: "Endevor SCL keyword"
                        };
                        result.push(item);
                    }
                    return [result, true];
                }
                return [[], true];
            } else {
                // has child
                for (const child of matchingNode.next) {
                    if (child.keyword) {
                        const phrases = child.keyword.split(", ");
                        for (const phrase of phrases) {
                            const item: CompletionItem = {
                                label: phrase.toUpperCase() + " ",
                                kind: CompletionItemKind.Keyword,
                                documentation: "Endevor SCL keyword"
                            };
                            result.push(item);
                        }
                    }
                }
            }
        }
        return [result, false];
    }

    private setCompletionItemFromParent(matchingNode: Inode): CompletionItem[] {
        const result = [];
        let node = matchingNode;
        while (!isNullOrUndefined(node.parent)) {
            // node has parent, check node's parent's other keyword child for completion item
            const parent = node.parent;
            // matchingNode has parent, check node's parent's other keyword child for completion item
            for (const child of (parent.next as Inode[])) {
                if (node.keyword && child.keyword && child.keyword === node.keyword &&
                    child.keyword.indexOf(", ") < 0)
                    continue; // only check other child
                if (child.keyword) {
                    const phrases = child.keyword.split(", ");
                    for (const phrase of phrases) {
                        const item: CompletionItem = {
                            label: phrase.toUpperCase() + " ",
                            kind: CompletionItemKind.Keyword,
                            documentation: "Endevor SCL keyword"
                        };
                        result.push(item);
                    }
                }
            }
            if (node.nogoback) { // no need to check up for more parents
                break;
            }
            node = node.parent;
        }
        return result;
    }

    processEOS() {
        const lastToken = this.parser.scl[this.parser.scl.length-1];
        const secondLastToken = this.parser.scl[this.parser.scl.length-2];

        if (!lastToken.is_eoStatement) {
            this.emit(DIAGNOSTICEVENT,
                lastToken.starti, lastToken.starti + lastToken.value.length,
                DiagnosticSeverity.Error,
                QUICKFIX_NO_EOS_MSG);
            return false;
        }
        if (lastToken.starti === secondLastToken.starti + secondLastToken.value.length) {
            this.emit(DIAGNOSTICEVENT,
                lastToken.starti, lastToken.starti + lastToken.value.length,
                DiagnosticSeverity.Error,
                QUICKFIX_SPACE_BEFORE_EOS_MSG);
            return false;
        }
        return true;
    }
}

interface ParseResult {
    isMatch: boolean;
    errorFound: boolean;
}
