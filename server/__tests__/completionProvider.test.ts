import { composeCompletionItemsFromKeywords } from '../src/CompletionProvider';

describe("Test keyword completion", () => {
    it("return a list of completion item from keywords in ParserTags", async () => {
        expect(composeCompletionItemsFromKeywords()).toMatchSnapshot();
    });
});