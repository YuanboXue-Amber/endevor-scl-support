import { isNullOrUndefined } from "util";

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
 * @class TokenizerBase
 */
class TokenizerBase {
    // content of the document
    content: string;
    // length of the document content
    contentLen: number;

    // next piece of scl. It is the result from peekNext; store to be reused by readNext
    current: TokenizedString;
    // the position of the next character to be processed after "current".
    nextPos: number = 0;

    // true if a peekNext was called and this.current is filled in
    peeked: boolean = false;

    constructor(input: string) {
        this.content = input;
        this.contentLen = input.length;
        this.nextPos = 0;
        this.current  = this.checkNext();
        this.nextPos = this.current.startPos + this.current.value.length;
        this.peeked = true;
    }

    /**
     * Peek the next piece of scl (doesn't move the reading cursor)
     *
     * @protected
     * @memberof TokenizerBase
     */
    protected basePeekNext = (() => {
        if (this.peeked) {
            return this.current;
        } else {
            this.current  = this.checkNext();
            this.nextPos = this.current.startPos + this.current.value.length;
            this.peeked = true;
            return this.current;
        }
    });

    /**
     * Read the next piece of scl (moves the reading cursor)
     *
     * @protected
     * @memberof TokenizerBase
     */
    protected baseReadNext = (() => {
        if (this.peeked) {
            this.peeked = false;
            return this.current;
        } else {
            this.current  = this.checkNext();
            this.nextPos = this.current.startPos + this.current.value.length;
            return this.current;
        }
    });

    /**
     * Read content from currentPos, and get a piece of SCL.
     * Return information of this piece as TokenizedString.
     * Return the currIndex, which points to the next unread char in content.
     *
     * @private
     * @returns {TokenizedString}
     * @memberof TokenizerBase
     */
    private checkNext(): TokenizedString {
        let currIndex = this.nextPos;
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
            return eof;
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
                return nextStrInfo;
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
                return nextStrInfo;
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
        return nextStrInfo;
    }

    /**
     * Get a piece of SCL. When there's quoted string, get the whole quoted part as 1 piece
     *
     * @private
     * @memberof TokenizerBase
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
     * @memberof TokenizerBase
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

/**
 * Tokenize a string into pieces of type TokenizedString.
 * Get a string based on TokenizerBase class, then check this string:
 * if it starts or end with operators ",=().",
 * return the beginning and end operator, and the value in the middle separately
 *
 * @export
 * @class Tokenizer
 * @extends {TokenizerBase}
 */
export class Tokenizer extends TokenizerBase {

    constructor(input: string) {
        super(input);
        this.tmpStorage = undefined;
        this.storePeek = this.current;
        this.peeked = true;
    }

    // When a scl piece has operators at the beginning or the end, use this to temporarily store the part that is unprocessed
    tmpStorage: TokenizedString | undefined;
    // store the peeked value, to be reused
    storePeek: TokenizedString;

    peeked: boolean = false;

    public peekNext = (() => {
        if (this.peeked) {
            return this.storePeek;
        }
        else {
            this.storePeek = this.getNext();
            this.peeked = true;
            return this.storePeek;
        }
    });

    public readNext = (() => {
        if (this.peeked) {
            this.peeked = false;
            return this.storePeek;
        }
        else {
            return this.getNext();
        }
    });

    /**
     * If there's no temporarily stored value (undefined this.tmpStorage), get a new piece from base.
     * Otherwise process this.tmpStorage.
     *
     * First check if it starts with an operator, if so return first operators then process the rest of the string.
     * Then check if it ends with an operator, if so return everything before the last position,
     * then return the last position (the operator).
     *
     * Note, if a string ends with multiple operators, for example "test((", it will be returned as "test(" and "(".
     * We don't care about processing it recursively because it doesn't affect the syntax diagnose.
     * Meaning, we will give the same diagnose to "test(" or "test(("
     *
     * @private
     * @memberof Tokenizer
     */
    private getNext = (() => {
        if (isNullOrUndefined(this.tmpStorage)) {
            this.tmpStorage = this.baseReadNext();
        }
        if (this.tmpStorage.value.length <= 1) {
            let tobeReturn = this.tmpStorage;
            this.tmpStorage = undefined;
            return tobeReturn;
        }
        if (this.tmpStorage.value[0].match(/[,=().]/)) {
            const opt = this.tmpStorage.value[0];
            this.tmpStorage.value = this.tmpStorage.value.substring(1, this.tmpStorage.value.length);
            this.tmpStorage.startPos = this.tmpStorage.startPos+1;
            return {
                value: opt,
                startPos: this.tmpStorage.startPos,
                is_word: false,
                is_keyword: false,
                is_op_char: true,
                is_eoStatement: this.tmpStorage.value[0] === "." ? true : false,
                is_eof: false
            };
        } else if (this.tmpStorage.value[this.tmpStorage.value.length-1].match(/[,=().]/)) {
            const toBeReturn = {
                value: this.tmpStorage.value.substring(0, this.tmpStorage.value.length - 1),
                startPos: this.tmpStorage.startPos,
                is_word: true,
                is_keyword: false,
                is_op_char: false,
                is_eoStatement: false,
                is_eof: false
            };
            const opt = this.tmpStorage.value[this.tmpStorage.value.length-1];
            this.tmpStorage = {
                value: opt,
                startPos: this.tmpStorage.startPos + toBeReturn.value.length,
                is_word: false,
                is_keyword: false,
                is_op_char: true,
                is_eoStatement: opt === "." ? true : false,
                is_eof: false
            };
            return toBeReturn;
        } else {
            let tobeReturn = this.tmpStorage;
            this.tmpStorage = undefined;
            return tobeReturn;
        }
    });

}
