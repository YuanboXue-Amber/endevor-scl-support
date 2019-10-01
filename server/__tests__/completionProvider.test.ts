import { composeCompletionItemsFromKeywords } from '../src/completionProvider';

describe("Test", () => {
    it("", async () => {
        expect(composeCompletionItemsFromKeywords()).toMatchSnapshot();
    });
});