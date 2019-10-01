import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    InitializeResult,
    CodeActionKind,
    CodeActionParams,
    CodeAction,
    TextDocument,
    TextDocumentChangeEvent
} from 'vscode-languageserver';
import { SyntaxDiagnose } from './parser/syntaxDiagnose';
import { quickfix } from './codeActionProvider';
import { isNullOrUndefined } from 'util';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

// // Does the client support the configuration abilities?
// let hasConfigurationCapability: boolean = false;
// // Does the client support multiple workspace folders?
// let hasWorkspaceFolderCapability: boolean = false;
// Does the clients accepts diagnostics with related information?
let hasDiagnosticRelatedInformationCapability: boolean = false;
let hasCodeActionLiteralsCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    // // Does the client support the `workspace/configuration` request?
    // // If not, we will fall back using global settings
    // hasConfigurationCapability = !!(
    //     capabilities.workspace && !!capabilities.workspace.configuration
    // );
    // hasWorkspaceFolderCapability = !!(
    //     capabilities.workspace && !!capabilities.workspace.workspaceFolders
    // );
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

// // After the client received the result of the initialize request
// // but before the client is sending any other request or notification to the server
// connection.onInitialized(() => {
//     if (hasConfigurationCapability) {
//         // Register for all configuration changes.
//         connection.client.register(DidChangeConfigurationNotification.type, undefined);
//     }
//     if (hasWorkspaceFolderCapability) {
//         connection.workspace.onDidChangeWorkspaceFolders(_event => {
//             connection.console.log('Workspace folder change event received.');
//         });
//     }
// });

// The example settings
// let globalSettings: ExampleSettings = defaultSettings;

// // Cache the settings of all open documents
// let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

// connection.onDidChangeConfiguration(change => {
//     if (hasConfigurationCapability) {
//         // Reset all cached document settings
//         documentSettings.clear();
//     } else {
//         globalSettings = <ExampleSettings>(
//             (change.settings.endevorSclLanguageServer || defaultSettings)
//         );
//     }

//     // Revalidate all open text documents
//     documents.all().forEach(validateTextDocument);
// });

// function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
//     if (!hasConfigurationCapability) {
//         return Promise.resolve(globalSettings);
//     }
//     let result = documentSettings.get(resource);
//     if (!result) {
//         result = connection.workspace.getConfiguration({
//             scopeUri: resource,
//             section: 'endevorSclLanguageServer'
//         });
//         documentSettings.set(resource, result);
//     }
//     return result;
// }

// // Only keep settings for open documents
// documents.onDidClose(e => {
//     documentSettings.delete(e.document.uri);
// });

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
        // The pass parameter contains the position of the text document in
        // which code complete got requested. For the example we ignore this
        // info and always provide the same completion items.
        return [
            {
                label: 'TypeScript',
                kind: CompletionItemKind.Text,
                data: 1
            },
            {
                label: 'JavaScript',
                kind: CompletionItemKind.Text,
                data: 2
            }
        ];
    }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        if (item.data === 1) {
            item.detail = 'TypeScript details';
            item.documentation = 'TypeScript documentation';
        } else if (item.data === 2) {
            item.detail = 'JavaScript details';
            item.documentation = 'JavaScript documentation';
        }
        return item;
    }
);

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
