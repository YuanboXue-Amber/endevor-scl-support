import { isNullOrUndefined } from "util";

// AmberTODO each token has to be checked if it start with or end with /[,=().]/, if so give warning
export interface TokenizedString {
    // value of the scl part
    value: string;
    // starting position of this value in the whole docuemnt content
    // can use TextDocument.positionAt to convert it into a Position type
    startPos: number;
    // true if value is a word
    is_word: boolean;
    // true if value is not only a word, but also a keyword (AmberTODO, this is to be identified when parse in a tree)
    is_keyword: boolean;
    // true if value is a single operator character (excluding ".", eoStatement character)
    is_op_char: boolean;
    // true if value symbolize the end of one scl statement "."
    is_eoStatement: boolean;
    // true if value symbolize the end of the file
    is_eof: boolean;
}

/**
 * Tokenize a string into pieces of type TokenizedString.
 * Read a string from left to right, return each piece separated by spaces.
 * Unless it is spaces in quotes, in that case, return the whole quoted piece.
 *
 * @export
 * @class Tokenizer
 */
export class Tokenizer {
    // content of the document
    content: string;
    // length of the document content
    contentLen: number;
    // the position of the next character to be processed
    currentPos: number;

    // next piece of scl. It is the result from peekNext; store to be reused by readNext
    next?: TokenizedString;
    // the position of the next character to be processed after "next". It is the result from peekNext; store to be reused by readNext
    nextPos?: number;

    constructor(input: string) {
        this.content = input;
        this.contentLen = input.length;
        this.currentPos = 0;
        this.next = undefined;
        this.nextPos = undefined;
    }

    /**
     * Peek the next piece of scl (doesn't move the reading cursor)
     *
     * @memberof Tokenizer
     */
    public peekNext = (() => {
        [this.next, this.nextPos]  = this.checkNext();
        return this.next;
    });

    /**
     * Read the next piece of scl (moves the reading cursor)
     *
     * @memberof Tokenizer
     */
    public readNext = (() => {
        if (!isNullOrUndefined(this.next)) {
            const nextTobeReturn = this.next;
            this.next = undefined;
            this.currentPos = (this.nextPos as number) + nextTobeReturn.value.length;
            this.nextPos = undefined;
            return nextTobeReturn;
        }
        const nextInfo = this.checkNext();
        this.currentPos = nextInfo[1] + nextInfo[0].value.length;
        this.next = undefined;
        this.nextPos = undefined;
        return nextInfo[0];
    });

    /**
     * Read content from currentPos, and get a piece of SCL.
     * Return information of this piece as TokenizedString.
     * Return the currIndex, which points to the next unread char in content.
     *
     * @private
     * @returns {[TokenizedString, number]}
     * @memberof Tokenizer
     */
    private checkNext(): [TokenizedString, number] {
        let currIndex = this.currentPos;
        while (this.content.charAt(currIndex).match(/\s/) && currIndex < this.contentLen) {
            currIndex ++;
        }
        if (currIndex >= this.contentLen) {
            const eof: TokenizedString = {
                value: "",
                startPos: currIndex,
                is_word: false,
                is_keyword: false,
                is_op_char: false,
                is_eoStatement: false,
                is_eof: true
            };
            return [eof, currIndex];
        }
        const startPos = currIndex;
        const next: string = this.getAPieceOfSCL("", currIndex);
        let nextStrInfo: TokenizedString;
        if (next.length === 1) {
            if (next === ".") {
                nextStrInfo = {
                    value: next,
                    startPos,
                    is_word: false,
                    is_keyword: false,
                    is_op_char: false,
                    is_eoStatement: true,
                    is_eof: false
                };
                return [nextStrInfo, currIndex];
            } else if (next.match(/[,=()]/)) {
                nextStrInfo = {
                    value: next,
                    startPos,
                    is_word: false,
                    is_keyword: false,
                    is_op_char: true,
                    is_eoStatement: false,
                    is_eof: false
                };
                return [nextStrInfo, currIndex];
            }
        }

        nextStrInfo = {
            value: next,
            startPos,
            is_word: true,
            is_keyword: false,
            is_op_char: false,
            is_eoStatement: false,
            is_eof: false
        };
        return [nextStrInfo, currIndex];
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
