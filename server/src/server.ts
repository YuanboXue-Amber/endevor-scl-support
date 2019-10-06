import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    CompletionItem,
    TextDocumentPositionParams,
    InitializeResult,
    CodeActionKind,
    CodeActionParams,
    CodeAction,
    TextDocumentChangeEvent,
    TextDocumentSyncKind,
    DidOpenTextDocumentParams,
    TextDocumentItem,
    DidCloseTextDocumentParams,
    DidChangeTextDocumentParams,
    Diagnostic
} from 'vscode-languageserver';
import { isNullOrUndefined } from 'util';
import { quickfix } from './CodeActionProvider';
import { composeCompletionItemsFromKeywords } from './CompletionProvider';
import { SCLDocumentManager } from './documents/SCLDocumentManager';
import { SCLDocument } from './documents/SCLDocument';
import { prepareTrees } from './parser/syntaxTrees/PrepareTrees';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

const documentManager = new SCLDocumentManager();

// Does the clients accepts diagnostics with related information?
let hasDiagnosticRelatedInformationCapability: boolean = false;
let hasCodeActionLiteralsCapability: boolean = false;

let completionItems: CompletionItem[] = [];

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    hasCodeActionLiteralsCapability = !!(
      capabilities.textDocument &&
      capabilities.textDocument.codeAction &&
      capabilities.textDocument.codeAction.codeActionLiteralSupport
    );

    SCLDocumentManager.config = {
        maxNumberOfProblems: 1000
    };
    SCLDocumentManager.capabilities = {
        hasDiagnosticRelatedInformationCapability
    };

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that the server supports code completion
            completionProvider: {
                resolveProvider: true
            },
            hoverProvider: true, // AmberTODO
        }
    };

    if (hasCodeActionLiteralsCapability) {
        result.capabilities.codeActionProvider = {
            codeActionKinds: [CodeActionKind.QuickFix]
        };
    }

    return result;
});

// After the client received the result of the initialize request
// but before the client is sending any other request or notification to the server
connection.onInitialized(() => {
    prepareTrees(); // read syntax trees from Json
    completionItems = composeCompletionItemsFromKeywords(); // initialize completion items
});

connection.onDidOpenTextDocument((parm: DidOpenTextDocumentParams) => {
    const document: SCLDocument = documentManager.openDocument(parm.textDocument);

    const diagnostics: Diagnostic[] = [];
    document.statements.forEach((statement) => {
        statement.diagnostics.forEach((diag) => {
            diagnostics.push(diag.diagnostic);
        });
    });
    connection.sendDiagnostics({
        uri: document.textDocument.uri,
        diagnostics
    });
});

connection.onDidChangeTextDocument((parm: DidChangeTextDocumentParams) => {
    const document: SCLDocument = documentManager.updateDocument(parm.textDocument, parm.contentChanges);

    const diagnostics: Diagnostic[] = [];
    document.statements.forEach((statement) => {
        statement.diagnostics.forEach((diag) => {
            diagnostics.push(diag.diagnostic);
        });
    });
    connection.sendDiagnostics({
        uri: document.textDocument.uri,
        diagnostics
    });
});

connection.onDidCloseTextDocument((parm: DidCloseTextDocumentParams) => {
    documentManager.closeDocument(parm.textDocument.uri);
});

connection.onCodeAction(provideCodeActions);

async function provideCodeActions(parms: CodeActionParams): Promise<CodeAction[]> {
    if (!parms.context.diagnostics.length) {
        return [];
    }
    const document = documentManager.documents.get(parms.textDocument.uri);
    if (isNullOrUndefined(document)) {
        return [];
    }
    return quickfix(document.textDocument, parms);
}

// This handler provides the initial list of the completion items.
connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
        const completionItemsBySyntax = documentManager.getCompletionBySyntax(_textDocumentPosition);
        if (completionItemsBySyntax.length > 0)
            return completionItemsBySyntax;
        return []; // completionItems;
    }
);

// A void completion resolve function just to handle the completion/resolve request.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        return item;
    }
);

// Listen on the connection
connection.listen();
