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
    Diagnostic,
    DidChangeConfigurationNotification,
    TextDocument,
    ExecuteCommandParams,
    CodeLensParams,
    Command,
    TextDocumentIdentifier
} from 'vscode-languageserver';
import { isNullOrUndefined } from 'util';
import { quickfix } from './CodeActionProvider';
import { composeCompletionItemsFromKeywords } from './CompletionProvider';
import { SCLDocumentManager, IDocumentSettings } from './documents/SCLDocumentManager';
import { SCLDocument } from './documents/SCLDocument';
import { prepareTrees } from './parser/syntaxTrees/PrepareTrees';
import { commands } from './ExecuteCommandProvider';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

let documents: TextDocuments = new TextDocuments();

const documentManager = new SCLDocumentManager();

// Does the clients accepts diagnostics with related information?
let hasConfigurationCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;
let hasCodeActionLiteralsCapability: boolean = false;

let completionItems: CompletionItem[] = [];

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );

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

    SCLDocumentManager.capabilities = {
        hasDiagnosticRelatedInformationCapability
    };

    const result: InitializeResult = {
        capabilities: {
            // textDocumentSync: TextDocumentSyncKind.Incremental,
            textDocumentSync: documents.syncKind,
            // Tell the client that the server supports code completion
            completionProvider: {
                resolveProvider: true
            },
            documentFormattingProvider: true,
            executeCommandProvider: {
                commands: commands.map(command => command.command)
            },
            codeLensProvider: {
                resolveProvider: true
            }
            // hoverProvider: true, // AmberTODO
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
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
});

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: IDocumentSettings = { maxNumberOfProblems: 1000, isREST: false };
let globalSettings: IDocumentSettings = defaultSettings;

// Cache the settings of all open documents
// let documentSettings: Map<string, Thenable<IDocumentSettings>> = new Map();

let documentSettings: Map<string, Thenable<IDocumentSettings>> = new Map();
connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
        SCLDocumentManager.config = globalSettings;
        SCLDocumentManager.numberOfProblems = 0;
    } else {
        globalSettings = <IDocumentSettings>(
            (change.settings.languageServerExample || defaultSettings)
        );
    }

    // Revalidate all open text documents
    documents.all().forEach(validateTextDocument);
});

// connection.onDidOpenTextDocument((parm: DidOpenTextDocumentParams) => {
//     const document: SCLDocument = documentManager.openOrChangeDocument(parm.textDocument);

//     const diagnostics: Diagnostic[] = [];
//     document.statements.forEach((statement) => {
//         statement.diagnostics.forEach((diag) => {
//             diagnostics.push(diag.diagnostic);
//         });
//     });
//     connection.sendDiagnostics({
//         uri: document.textDocument.uri,
//         diagnostics
//     });
// });

// connection.onDidChangeTextDocument((parm: DidChangeTextDocumentParams) => {
//     const document: SCLDocument = documentManager.updateDocument(parm.textDocument, parm.contentChanges);

//     const diagnostics: Diagnostic[] = [];
//     document.statements.forEach((statement) => {
//         statement.diagnostics.forEach((diag) => {
//             diagnostics.push(diag.diagnostic);
//         });
//     });
//     connection.sendDiagnostics({
//         uri: document.textDocument.uri,
//         diagnostics
//     });
// });

// connection.onDidCloseTextDocument((parm: DidCloseTextDocumentParams) => {
//     documentManager.closeDocument(parm.textDocument.uri);
// });

// Only keep settings for open documents
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
    documentManager.closeDocument(e.document.uri);
});

function getDocumentSettings(resource: string): Thenable<IDocumentSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'endevorSclLanguageServer'
        });
        documentSettings.set(resource, result);
    }
    return result;
}

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    SCLDocumentManager.config = await getDocumentSettings(textDocument.uri);

    const document: SCLDocument = documentManager.openOrChangeDocument(textDocument);

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
}


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

connection.onDocumentFormatting(evt => documentManager.formatDocument(evt.textDocument));

connection.onCodeLens(evt => documentManager.computeCodeLenses(evt.textDocument));

connection.onCodeLensResolve(codeLens => codeLens);
connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
    connection.window.showInformationMessage('Hello World!');
    const result = await documentManager.executeCodeLens(params);
    connection.console.log("result is: " + result);
    connection.window.showInformationMessage("result is: " + result);
    connection.window.showErrorMessage("TEST AMBER ERROR");
    connection.window.showWarningMessage("TEST AMBER WARN");
});

documents.listen(connection);

// Listen on the connection
connection.listen();

// connection.window.showInformationMessage('Hello hello World!');