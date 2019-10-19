import { isNullOrUndefined } from "util";
import { CompletionItem } from 'vscode-languageserver';

export interface ITokenizedString {
    // value of the scl part
    value: string;
    // starting position of this value in the whole docuemnt content
    // can use TextDocument.positionAt to convert it into a Position type
    starti: number;
    // true if value symbolize the end of one scl statement "."
    is_eoStatement: boolean;

    completionItems?: CompletionItem[];
    rightDistance?: string; // distance between this token and the token after, used for formating
}

/**
 * Tokenize a string into pieces of type ITokenizedString.
 * Read a string from left to right, return each piece separated by spaces.
 * Unless it is spaces in quotes, in that case, return the whole quoted piece.
 *
 * @export
 * @class Tokenizer
 */
export class Tokenizer {
    // content of the document
    private content: string;
    // length of the document content
    private contentLen: number;

    // next piece of scl. It is the result from peekNext; store to be reused by readNext
    private current: ITokenizedString;
    // the position of the next character to be processed after "current".
    private nextstarti: number = 0;

    // true if a peekNext was called and this.current is filled in
    private peeked: boolean = false;

    constructor(input: string) {
        this.content = input;
        this.contentLen = input.length;
        this.nextstarti = 0;
        this.current  = this.checkNext();
        this.nextstarti = this.current.starti + this.current.value.length;
        this.peeked = true;
    }

    /**
     * Peek the next piece of scl (doesn't move the reading cursor)
     *
     * @memberof Tokenizer
     */
    peekNext = (() => {
        if (this.peeked) {
            return this.current;
        } else {
            this.current  = this.checkNext();
            this.nextstarti = this.current.starti + this.current.value.length;
            this.peeked = true;
            return this.current;
        }
    });

    /**
     * Read the next piece of scl (moves the reading cursor)
     *
     * @memberof Tokenizer
     */
    readNext = (() => {
        if (this.peeked) {
            this.peeked = false;
            return this.current;
        } else {
            this.current  = this.checkNext();
            this.nextstarti = this.current.starti + this.current.value.length;
            return this.current;
        }
    });


    private tmpStorage: number | undefined = undefined; // in case any string end with ".", we return first the string before ".", then ".". We use this to store the position of "."
    /**
     * Read content from currentPos, and get a piece of SCL.
     * Return information of this piece as ITokenizedString.
     * Return the currIndex, which points to the next unread char in content.
     *
     * @private
     * @returns {ITokenizedString}
     * @memberof Tokenizer
     */
    private checkNext(): ITokenizedString {
        let nextStrInfo: ITokenizedString;

        if (!isNullOrUndefined(this.tmpStorage)) {
            nextStrInfo = {
                value: ".",
                starti: this.tmpStorage,
                is_eoStatement: true
            };
            this.tmpStorage = undefined;
            return nextStrInfo;
        }

        let currIndex = this.nextstarti;
        while (this.content.charAt(currIndex).match(/\s/) && currIndex < this.contentLen) {
            currIndex ++; // skip spaces
        }

        if (currIndex >= this.contentLen) { // finish the whole document
            const eof: ITokenizedString = {
                value: "",
                starti: currIndex,
                is_eoStatement: false
            };
            return eof;
        }

        const starti = currIndex;
        const next: string = this.getAPieceOfSCL("", currIndex);
        if (next.length === 1 && next === ".") {
            nextStrInfo = {
                value: next,
                starti,
                is_eoStatement: true
            };
            return nextStrInfo;
        }
        if (next.length > 1 && next.charAt(next.length-1) === ".") {
            this.tmpStorage = starti + next.length-1;

            nextStrInfo = {
                value: next.substring(0, next.length-1),
                starti,
                is_eoStatement: false
            };
            return nextStrInfo;
        }

        nextStrInfo = {
            value: next,
            starti,
            is_eoStatement: false
        };
        return nextStrInfo;
    }

    /**
     * Get a piece of SCL. When there's quoted string, get the whole quoted part as 1 piece
     *
     * @private
     * @memberof Tokenizer
     */
    private getAPieceOfSCL = ((currStr: string, currIndex: number): string => {
        while (!this.content.charAt(currIndex).match(/\s/) && currIndex < this.contentLen) {
            // append all non white space characters
            currStr += this.content.charAt(currIndex);
            currIndex ++;
        }
        if (this.isQuoteBalanced(currStr) || currIndex >= this.contentLen) {
            return currStr;
        } else {
            // quote unbalance, append all the following white space charaters
            while (this.content.charAt(currIndex).match(/\s/)) {
                currStr += this.content.charAt(currIndex);
                currIndex ++;
            }
            // check the next non white space characters piece, try to do the same append and quote check
            currStr = this.getAPieceOfSCL(currStr, currIndex);
            return currStr;
        }
    });

    /**
     * returns true when the input string has balanced quotes:
     * single quotes are enclosed by double quotes and vice versa
     *
     * @private
     * @param {string} str
     * @returns {boolean}
     * @memberof Tokenizer
     */
    private isQuoteBalanced(str: string): boolean {
        if (!str.includes("'") && !str.includes("\"")) {
            return true;  // no quote
        }

        let firstSingleQuoteIndex = -1;
        let firstDoubleQuoteIndex = -1;
        let lastSingleQuoteIndex = -1;
        let lastDoubleQuoteIndex =-1;
        let singleQuoteNum = 0;
        let doubleQuoteNum = 0;

        const strLen = str.length;
        for (let i = 0; i < strLen; ++ i) {
            switch (str.charAt(i)) {
                case "'":
                    if (firstSingleQuoteIndex < 0) {
                        firstSingleQuoteIndex = i;
                    }
                    if (lastSingleQuoteIndex < i) {
                        lastSingleQuoteIndex = i;
                    }
                    singleQuoteNum ++;
                    break;
                case "\"":
                    if (firstDoubleQuoteIndex < 0) {
                        firstDoubleQuoteIndex = i;
                    }
                    if (lastDoubleQuoteIndex < i) {
                        lastDoubleQuoteIndex = i;
                    }
                    doubleQuoteNum ++;
                    break;
                default:
                    break;
            }
        }

        let firstQuoteSingle = true;
        if (firstDoubleQuoteIndex >= 0) {
            if (firstSingleQuoteIndex < 0 || firstDoubleQuoteIndex < firstSingleQuoteIndex) {
                firstQuoteSingle = false;
            }
        }
        let lastQuoteSingle = true;
        if (lastDoubleQuoteIndex >= 0) {
            if (lastSingleQuoteIndex < 0 || lastDoubleQuoteIndex > lastSingleQuoteIndex) {
                lastQuoteSingle = false;
            }
        }

        if (singleQuoteNum%2 === 0 && doubleQuoteNum%2 === 0) {
            if ((firstQuoteSingle && lastQuoteSingle) || (!firstQuoteSingle && !lastQuoteSingle)) {
                return true; // both single and double quotes are balanced, and not something like '"'"
            }
            return false;
        }

        if (singleQuoteNum%2 !== 0) { // single quotes unbalanced
            if (doubleQuoteNum > 0 && doubleQuoteNum%2 === 0 && !firstQuoteSingle) {
                return true; // double quotes are balanced and outside of single quotes
            }
        }

        if (doubleQuoteNum%2 !== 0) { // double quotes unbalanced
            if (singleQuoteNum > 0 && singleQuoteNum%2 === 0 && firstQuoteSingle) {
                return true; // single quotes are balanced and outside of double quotes
            }
        }

        return false;
    }

}
