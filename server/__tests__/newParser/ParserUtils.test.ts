import { match } from '../../src/newParser/PreParserUtils';

describe("Test match", () => {
    it("", async () => {
        expect(match("input", "INPut")).toBe(true);
        expect(match("inpu", "INPut")).toBe(true);
        expect(match("inp", "INPut")).toBe(true);
        expect(match("in", "INPut")).toBe(false);
        expect(match("ina", "INPut")).toBe(false);
        expect(match("inputa", "INPut")).toBe(false);
    });
});
