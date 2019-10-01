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
    TextDocumentChangeEvent
} from 'vscode-languageserver';
import { isNullOrUndefined } from 'util';
import { SyntaxDiagnose } from './parser/syntaxDiagnose';
import { quickfix } from './codeActionProvider';
import { composeCompletionItemsFromKeywords } from './completionProvider';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

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

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: documents.syncKind,
            // Tell the client that the server supports code completion
            completionProvider: {
                resolveProvider: true
            },
            hoverProvider: true, // AmberTODO
            documentHighlightProvider: true,
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
    completionItems = composeCompletionItemsFromKeywords(); // initialize completion items
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(validateTextDocument);

async function validateTextDocument(textDocumentChange: TextDocumentChangeEvent): Promise<void> {
    const syntaxDiagnose: SyntaxDiagnose = new SyntaxDiagnose(
        textDocumentChange.document,
        hasDiagnosticRelatedInformationCapability);
    connection.sendDiagnostics({
        uri: textDocumentChange.document.uri,
        diagnostics: syntaxDiagnose.diagnostics
    });
}

connection.onCodeAction(provideCodeActions);

async function provideCodeActions(parms: CodeActionParams): Promise<CodeAction[]> {
    if (!parms.context.diagnostics.length) {
        return [];
    }
    const textDocument = documents.get(parms.textDocument.uri);
    if (isNullOrUndefined(textDocument)) {
        return [];
    }
    return quickfix(textDocument, parms);
}

// This handler provides the initial list of the completion items.
connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
        return completionItems;
    }
);

// A void completion resolve function just to handle the completion/resolve request.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        return item;
    }
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
