import { Command } from "vscode-languageserver";
import { SCLDocument, SCLstatement } from './documents/SCLDocument';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from "child_process";
import { match } from './parser/PreParserUtils';
import { isNullOrUndefined } from 'util';

const SUBMITSCL_COMMAND = Command.create('Submit scl', "endevorscl.submitscl");
// const OPENDOC_COMMAND = Command.create('Open link to techDocs', "endevorscl.techdocs");
export const commands = [
    SUBMITSCL_COMMAND,
    // OPENDOC_COMMAND
];

export const executeSubmitSCL= ((document: SCLDocument, starti: number) => {
    for (const statement of document.statements) {
        if (statement.starti === starti) {
            const type = getTypeFromSCL(statement);
            if (isNullOrUndefined(type)) {
                return null;
            }
            const sclString = document.textDocument.getText().substring(starti, statement.endi);
            const sclFilePath = path.join(__dirname, "temp.txt");
            fs.writeFileSync(sclFilePath, sclString, "utf-8");
            const result = execSync(`zowe endevor submit scl --sf ${sclFilePath} --sclt ${type} -i CMEWXYTS`);
            return result;
        }
    }
    throw new Error(`Unable to locate codeLens request in the current document`);
});

function getTypeFromSCL(statement: SCLstatement) {

    if (match(statement.tokens[0].value, "LISt"))
        return "list";
    if (statement.tokens.length > 1) {
        if (match(statement.tokens[1].value, "PACkage"))
            return "package";
        if (match(statement.tokens[1].value, "ELEment")) {
            return "element";
        }
    }
    return null;
}