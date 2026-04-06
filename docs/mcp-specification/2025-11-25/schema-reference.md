Title: Schema Reference - Model Context Protocol

URL Source: https://modelcontextprotocol.io/specification/2025-11-25/schema

Markdown Content:
# Schema Reference - Model Context Protocol

[Skip to main content](https://modelcontextprotocol.io/specification/2025-11-25/schema#content-area)

[Model Context Protocol home page![Image 1: light logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/light.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=a5ac61ce77858fb1ddaf6de761c39499)![Image 2: dark logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/dark.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=1227cb7feb8344f9f6288c6b5b0a6d80)](https://modelcontextprotocol.io/)

Version 2025-11-25 (latest)

Search...

⌘K

*   [Blog](https://blog.modelcontextprotocol.io/)
*   [GitHub](https://github.com/modelcontextprotocol)

Search...

Navigation

Schema Reference

[Documentation](https://modelcontextprotocol.io/docs/getting-started/intro)[Extensions](https://modelcontextprotocol.io/extensions/overview)[Specification](https://modelcontextprotocol.io/specification/2025-11-25)[Registry](https://modelcontextprotocol.io/registry/about)[SEPs](https://modelcontextprotocol.io/seps)[Community](https://modelcontextprotocol.io/community/contributing)

*   [Specification](https://modelcontextprotocol.io/specification/2025-11-25)

*   [Key Changes](https://modelcontextprotocol.io/specification/2025-11-25/changelog)

*   [Architecture](https://modelcontextprotocol.io/specification/2025-11-25/architecture)

##### Base Protocol

*   [Overview](https://modelcontextprotocol.io/specification/2025-11-25/basic)
*   [Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
*   [Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
*   [Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
*   Utilities 

##### Client Features

*   [Roots](https://modelcontextprotocol.io/specification/2025-11-25/client/roots)
*   [Sampling](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling)
*   [Elicitation](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation)

##### Server Features

*   [Overview](https://modelcontextprotocol.io/specification/2025-11-25/server)
*   [Prompts](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts)
*   [Resources](https://modelcontextprotocol.io/specification/2025-11-25/server/resources)
*   [Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
*   Utilities 

*   [Schema Reference](https://modelcontextprotocol.io/specification/2025-11-25/schema)

On this page

*   [JSON-RPC](https://modelcontextprotocol.io/specification/2025-11-25/schema#json-rpc)
*   [JSONRPCErrorResponse](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcerrorresponse)
*   [JSONRPCMessage](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcmessage)
*   [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification)
*   [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest)
*   [JSONRPCResponse](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresponse)
*   [JSONRPCResultResponse](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresultresponse)
*   [Common Types](https://modelcontextprotocol.io/specification/2025-11-25/schema#common-types)
*   [Annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations)
*   [Cursor](https://modelcontextprotocol.io/specification/2025-11-25/schema#cursor)
*   [EmptyResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#emptyresult)
*   [Error](https://modelcontextprotocol.io/specification/2025-11-25/schema#error)
*   [Icon](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon)
*   [LoggingLevel](https://modelcontextprotocol.io/specification/2025-11-25/schema#logginglevel)
*   [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken)
*   [RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid)
*   [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result)
*   [Role](https://modelcontextprotocol.io/specification/2025-11-25/schema#role)
*   [Content](https://modelcontextprotocol.io/specification/2025-11-25/schema#content)
*   [AudioContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent)
*   [BlobResourceContents](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents)
*   [ContentBlock](https://modelcontextprotocol.io/specification/2025-11-25/schema#contentblock)
*   [EmbeddedResource](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource)
*   [ImageContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent)
*   [ResourceLink](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink)
*   [TextContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent)
*   [TextResourceContents](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents)
*   [completion/complete](https://modelcontextprotocol.io/specification/2025-11-25/schema#completion%2Fcomplete)
*   [CompleteRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequest)
*   [CompleteRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams)
*   [CompleteResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#completeresult)
*   [PromptReference](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptreference)
*   [ResourceTemplateReference](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplatereference)
*   [elicitation/create](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitation%2Fcreate)
*   [ElicitRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequest)
*   [ElicitRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestparams)
*   [ElicitResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitresult)
*   [BooleanSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema)
*   [ElicitRequestFormParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams)
*   [ElicitRequestURLParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams)
*   [EnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#enumschema)
*   [LegacyTitledEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema)
*   [MultiSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#multiselectenumschema)
*   [NumberSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema)
*   [PrimitiveSchemaDefinition](https://modelcontextprotocol.io/specification/2025-11-25/schema#primitiveschemadefinition)
*   [SingleSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#singleselectenumschema)
*   [StringSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema)
*   [TitledMultiSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema)
*   [TitledSingleSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema)
*   [UntitledMultiSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema)
*   [UntitledSingleSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema)
*   [initialize](https://modelcontextprotocol.io/specification/2025-11-25/schema#initialize)
*   [InitializeRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequest)
*   [InitializeRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams)
*   [InitializeResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult)
*   [ClientCapabilities](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities)
*   [Implementation](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation)
*   [ServerCapabilities](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities)
*   [logging/setLevel](https://modelcontextprotocol.io/specification/2025-11-25/schema#logging%2Fsetlevel)
*   [SetLevelRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequest)
*   [SetLevelRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequestparams)
*   [notifications/cancelled](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Fcancelled)
*   [CancelledNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotification)
*   [CancelledNotificationParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotificationparams)
*   [notifications/initialized](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Finitialized)
*   [InitializedNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializednotification)
*   [notifications/tasks/status](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Ftasks%2Fstatus)
*   [TaskStatusNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotification)
*   [TaskStatusNotificationParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotificationparams)
*   [notifications/message](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Fmessage)
*   [LoggingMessageNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotification)
*   [LoggingMessageNotificationParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams)
*   [notifications/progress](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Fprogress)
*   [ProgressNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotification)
*   [ProgressNotificationParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams)
*   [notifications/prompts/list_changed](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Fprompts%2Flist_changed)
*   [PromptListChangedNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptlistchangednotification)
*   [notifications/resources/list_changed](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Fresources%2Flist_changed)
*   [ResourceListChangedNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelistchangednotification)
*   [notifications/resources/updated](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Fresources%2Fupdated)
*   [ResourceUpdatedNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotification)
*   [ResourceUpdatedNotificationParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotificationparams)
*   [notifications/roots/list_changed](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Froots%2Flist_changed)
*   [RootsListChangedNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#rootslistchangednotification)
*   [notifications/tools/list_changed](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Ftools%2Flist_changed)
*   [ToolListChangedNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#toollistchangednotification)
*   [notifications/elicitation/complete](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications%2Felicitation%2Fcomplete)
*   [ElicitationCompleteNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitationcompletenotification)
*   [ping](https://modelcontextprotocol.io/specification/2025-11-25/schema#ping)
*   [PingRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#pingrequest)
*   [tasks](https://modelcontextprotocol.io/specification/2025-11-25/schema#tasks)
*   [CreateTaskResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#createtaskresult)
*   [RelatedTaskMetadata](https://modelcontextprotocol.io/specification/2025-11-25/schema#relatedtaskmetadata)
*   [Task](https://modelcontextprotocol.io/specification/2025-11-25/schema#task)
*   [TaskMetadata](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskmetadata)
*   [TaskStatus](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatus)
*   [tasks/get](https://modelcontextprotocol.io/specification/2025-11-25/schema#tasks%2Fget)
*   [GetTaskRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskrequest)
*   [GetTaskResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskresult)
*   [tasks/result](https://modelcontextprotocol.io/specification/2025-11-25/schema#tasks%2Fresult)
*   [GetTaskPayloadRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadrequest)
*   [GetTaskPayloadResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadresult)
*   [tasks/list](https://modelcontextprotocol.io/specification/2025-11-25/schema#tasks%2Flist)
*   [ListTasksRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksrequest)
*   [ListTasksResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksresult)
*   [tasks/cancel](https://modelcontextprotocol.io/specification/2025-11-25/schema#tasks%2Fcancel)
*   [CancelTaskRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskrequest)
*   [CancelTaskResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskresult)
*   [prompts/get](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompts%2Fget)
*   [GetPromptRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequest)
*   [GetPromptRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequestparams)
*   [GetPromptResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptresult)
*   [PromptMessage](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptmessage)
*   [prompts/list](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompts%2Flist)
*   [ListPromptsRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsrequest)
*   [ListPromptsResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsresult)
*   [Prompt](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt)
*   [PromptArgument](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument)
*   [resources/list](https://modelcontextprotocol.io/specification/2025-11-25/schema#resources%2Flist)
*   [ListResourcesRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesrequest)
*   [ListResourcesResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesresult)
*   [Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource)
*   [resources/read](https://modelcontextprotocol.io/specification/2025-11-25/schema#resources%2Fread)
*   [ReadResourceRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequest)
*   [ReadResourceRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequestparams)
*   [ReadResourceResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourceresult)
*   [resources/subscribe](https://modelcontextprotocol.io/specification/2025-11-25/schema#resources%2Fsubscribe)
*   [SubscribeRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequest)
*   [SubscribeRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequestparams)
*   [resources/templates/list](https://modelcontextprotocol.io/specification/2025-11-25/schema#resources%2Ftemplates%2Flist)
*   [ListResourceTemplatesRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesrequest)
*   [ListResourceTemplatesResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesresult)
*   [ResourceTemplate](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate)
*   [resources/unsubscribe](https://modelcontextprotocol.io/specification/2025-11-25/schema#resources%2Funsubscribe)
*   [UnsubscribeRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequest)
*   [UnsubscribeRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequestparams)
*   [roots/list](https://modelcontextprotocol.io/specification/2025-11-25/schema#roots%2Flist)
*   [ListRootsRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsrequest)
*   [ListRootsResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsresult)
*   [Root](https://modelcontextprotocol.io/specification/2025-11-25/schema#root)
*   [sampling/createMessage](https://modelcontextprotocol.io/specification/2025-11-25/schema#sampling%2Fcreatemessage)
*   [CreateMessageRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequest)
*   [CreateMessageRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams)
*   [CreateMessageResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult)
*   [ModelHint](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelhint)
*   [ModelPreferences](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences)
*   [SamplingMessage](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage)
*   [SamplingMessageContentBlock](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessagecontentblock)
*   [ToolChoice](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolchoice)
*   [ToolResultContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent)
*   [ToolUseContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent)
*   [tools/call](https://modelcontextprotocol.io/specification/2025-11-25/schema#tools%2Fcall)
*   [CallToolRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequest)
*   [CallToolRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams)
*   [CallToolResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult)
*   [tools/list](https://modelcontextprotocol.io/specification/2025-11-25/schema#tools%2Flist)
*   [ListToolsRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsrequest)
*   [ListToolsResult](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsresult)
*   [Tool](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool)
*   [ToolAnnotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations)
*   [ToolExecution](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolexecution)

# Schema Reference

Copy page

Copy page

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#json-rpc)

JSON-RPC

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcerrorresponse)

`JSONRPCErrorResponse`

interface JSONRPCErrorResponse{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcerrorresponse-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcerrorresponse-id)?:[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[error](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcerrorresponse-error):[Error](https://modelcontextprotocol.io/specification/2025-11-25/schema#error);

}

A response to a request that indicates an error occurred.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcerrorresponse-jsonrpc)

id?: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcerrorresponse-id)

error: Error[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcerrorresponse-error)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcmessage)

`JSONRPCMessage`

JSONRPCMessage:[JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest)|[JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification)|[JSONRPCResponse](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresponse)

Refers to any valid JSON-RPC object that can be decoded off the wire, or encoded to be sent.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification)

`JSONRPCNotification`

interface JSONRPCNotification{

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method):string;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)?:{[key:string]:any};

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc):“2.0”;

}

A notification which does not expect a response.

method: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

Inherited from Notification.method

params?: { [key: string]: any }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

Inherited from Notification.params

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest)

`JSONRPCRequest`

interface JSONRPCRequest{

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method):string;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)?:{[key:string]:any};

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

}

A request that expects a response.

method: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

Inherited from Request.method

params?: { [key: string]: any }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

Inherited from Request.params

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresponse)

`JSONRPCResponse`

JSONRPCResponse:[JSONRPCResultResponse](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresultresponse)|[JSONRPCErrorResponse](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcerrorresponse)

A response to a request, containing either the result or error.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresultresponse)

`JSONRPCResultResponse`

interface JSONRPCResultResponse{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresultresponse-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresultresponse-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[result](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresultresponse-result):[Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result);

}

A successful (non-error) response to a request.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresultresponse-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresultresponse-id)

result: Result[](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcresultresponse-result)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#common-types)

Common Types

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations)

`Annotations`

interface Annotations{

[audience](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations-audience)?:[Role](https://modelcontextprotocol.io/specification/2025-11-25/schema#role)[];

[priority](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations-priority)?:number;

[lastModified](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations-lastmodified)?:string;

}

Optional annotations for the client. The client can use annotations to inform how objects are used or displayed

audience?: Role[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations-audience)

Describes who the intended audience of this object or data is.

It can include multiple entries to indicate content useful for multiple audiences (e.g., `[“user”, “assistant”]`).

priority?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations-priority)

Describes how important this data is for operating the server.

A value of 1 means “most important,” and indicates that the data is effectively required, while 0 means “least important,” and indicates that the data is entirely optional.

lastModified?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations-lastmodified)

The moment the resource was last modified, as an ISO 8601 formatted string.

Should be an ISO 8601 formatted string (e.g., “2025-01-12T15:00:58Z”).

Examples: last activity timestamp in an open file, timestamp when the resource was attached, etc.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#cursor)

`Cursor`

Cursor:string

An opaque token used to represent a cursor for pagination.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#emptyresult)

`EmptyResult`

EmptyResult:[Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result)

A response that indicates success but carries no data.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#error)

`Error`

interface Error{

[code](https://modelcontextprotocol.io/specification/2025-11-25/schema#error-code):number;

[message](https://modelcontextprotocol.io/specification/2025-11-25/schema#error-message):string;

[data](https://modelcontextprotocol.io/specification/2025-11-25/schema#error-data)?:unknown;

}

code: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#error-code)

The error type that occurred.

message: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#error-message)

A short description of the error. The message SHOULD be limited to a concise single sentence.

data?: unknown[](https://modelcontextprotocol.io/specification/2025-11-25/schema#error-data)

Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon)

`Icon`

interface Icon{

[src](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon-src):string;

[mimeType](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon-mimetype)?:string;

[sizes](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon-sizes)?:string[];

[theme](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon-theme)?:“light”|“dark”;

}

An optionally-sized icon that can be displayed in a user interface.

src: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon-src)

A standard URI pointing to an icon resource. May be an HTTP/HTTPS URL or a `data:` URI with Base64-encoded image data.

Consumers SHOULD takes steps to ensure URLs serving icons are from the same domain as the client/server or a trusted domain.

Consumers SHOULD take appropriate precautions when consuming SVGs as they can contain executable JavaScript.

mimeType?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon-mimetype)

Optional MIME type override if the source MIME type is missing or generic. For example: `“image/png”`, `“image/jpeg”`, or `“image/svg+xml”`.

sizes?: string[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon-sizes)

Optional array of strings that specify sizes at which the icon can be used. Each string should be in WxH format (e.g., `“48x48”`, `“96x96”`) or `“any”` for scalable formats like SVG.

If not provided, the client should assume that the icon can be used at any size.

theme?: “light” | “dark”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon-theme)

Optional specifier for the theme this icon is designed for. `light` indicates the icon is designed to be used with a light background, and `dark` indicates the icon is designed to be used with a dark background.

If not provided, the client should assume the icon can be used with any theme.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#logginglevel)

`LoggingLevel`

LoggingLevel:

|“debug”

|“info”

|“notice”

|“warning”

|“error”

|“critical”

|“alert”

|“emergency”

The severity of a log message.

These map to syslog message severities, as specified in RFC-5424: [[https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1](https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1)](https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken)

`ProgressToken`

ProgressToken:string|number

A progress token, used to associate progress notifications with the original request.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid)

`RequestId`

RequestId:string|number

A uniquely identifying ID for a request in JSON-RPC.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#result)

`Result`

interface Result{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)?:{[key:string]:unknown};

[key:string]:unknown;

}

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#role)

`Role`

Role:“user”|“assistant”

The sender or recipient of messages and data in a conversation.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#content)

Content

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent)

`AudioContent`

interface AudioContent{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent-type):“audio”;

[data](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent-data):string;

[mimeType](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent-mimetype):string;

[annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent-annotations)?:[Annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations);

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent-_meta)?:{[key:string]:unknown};

}

Audio provided to or from an LLM.

type: “audio”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent-type)

data: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent-data)

The base64-encoded audio data.

mimeType: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent-mimetype)

The MIME type of the audio. Different providers may support different audio types.

annotations?: Annotations[](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent-annotations)

Optional annotations for the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents)

`BlobResourceContents`

interface BlobResourceContents{

[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents-uri):string;

[mimeType](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents-mimetype)?:string;

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents-_meta)?:{[key:string]:unknown};

[blob](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents-blob):string;

}

uri: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents-uri)

The URI of this resource.

Inherited from ResourceContents.uri

mimeType?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents-mimetype)

The MIME type of this resource, if known.

Inherited from ResourceContents.mimeType

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from ResourceContents._meta

blob: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents-blob)

A base64-encoded string representing the binary data of the item.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#contentblock)

`ContentBlock`

ContentBlock:

|[TextContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent)

|[ImageContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent)

|[AudioContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent)

|[ResourceLink](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink)

|[EmbeddedResource](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource)

`EmbeddedResource`

interface EmbeddedResource{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource-type):“resource”;

[resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource-resource):[TextResourceContents](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents)|[BlobResourceContents](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents);

[annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource-annotations)?:[Annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations);

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource-_meta)?:{[key:string]:unknown};

}

The contents of a resource, embedded into a prompt or tool call result.

It is up to the client how best to render embedded resources for the benefit of the LLM and/or the user.

type: “resource”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource-type)

resource: TextResourceContents | BlobResourceContents[](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource-resource)

annotations?: Annotations[](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource-annotations)

Optional annotations for the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#embeddedresource-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent)

`ImageContent`

interface ImageContent{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent-type):“image”;

[data](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent-data):string;

[mimeType](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent-mimetype):string;

[annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent-annotations)?:[Annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations);

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent-_meta)?:{[key:string]:unknown};

}

An image provided to or from an LLM.

type: “image”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent-type)

data: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent-data)

The base64-encoded image data.

mimeType: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent-mimetype)

The MIME type of the image. Different providers may support different image types.

annotations?: Annotations[](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent-annotations)

Optional annotations for the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink)

`ResourceLink`

interface ResourceLink{

[icons](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-icons)?:[Icon](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon)[];

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-name):string;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-title)?:string;

[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-uri):string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-description)?:string;

[mimeType](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-mimetype)?:string;

[annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-annotations)?:[Annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations);

[size](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-size)?:number;

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-_meta)?:{[key:string]:unknown};

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-type):“resource_link”;

}

A resource that the server is capable of reading, included in a prompt or tool call result.

Note: resource links returned by tools are not guaranteed to appear in the results of `resources/list` requests.

icons?: Icon[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-icons)

Optional set of sized icons that the client can display in a user interface.

Clients that support rendering icons MUST support at least the following MIME types:

*   `image/png` - PNG images (safe, universal compatibility)
*   `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)

Clients that support rendering icons SHOULD also support:

*   `image/svg+xml` - SVG images (scalable but requires security precautions)
*   `image/webp` - WebP images (modern, efficient format)

Inherited from [Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource).[icons](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-icons)

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-name)

Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn’t present).

Inherited from [Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource).[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-name)

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-title)

Intended for UI and end-user contexts — optimized to be human-readable and easily understood, even by those unfamiliar with domain-specific terminology.

If not provided, the name should be used for display (except for Tool, where `annotations.title` should be given precedence over using `name`, if present).

Inherited from [Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource).[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-title)

uri: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-uri)

The URI of this resource.

Inherited from [Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource).[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-uri)

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-description)

A description of what this resource represents.

This can be used by clients to improve the LLM’s understanding of available resources. It can be thought of like a “hint” to the model.

Inherited from [Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource).[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-description)

mimeType?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-mimetype)

The MIME type of this resource, if known.

Inherited from [Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource).[mimeType](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-mimetype)

annotations?: Annotations[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-annotations)

Optional annotations for the client.

Inherited from [Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource).[annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-annotations)

size?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-size)

The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.

This can be used by Hosts to display file sizes and estimate context window usage.

Inherited from [Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource).[size](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-size)

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-_meta)

type: “resource_link”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelink-type)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent)

`TextContent`

interface TextContent{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent-type):“text”;

[text](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent-text):string;

[annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent-annotations)?:[Annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations);

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent-_meta)?:{[key:string]:unknown};

}

Text provided to or from an LLM.

type: “text”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent-type)

text: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent-text)

The text content of the message.

annotations?: Annotations[](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent-annotations)

Optional annotations for the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents)

`TextResourceContents`

interface TextResourceContents{

[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents-uri):string;

[mimeType](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents-mimetype)?:string;

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents-_meta)?:{[key:string]:unknown};

[text](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents-text):string;

}

uri: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents-uri)

The URI of this resource.

Inherited from ResourceContents.uri

mimeType?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents-mimetype)

The MIME type of this resource, if known.

Inherited from ResourceContents.mimeType

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from ResourceContents._meta

text: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents-text)

The text of the item. This must only be set if the item can actually be represented as text (not binary data).

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#completion/complete)

`completion/complete`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequest)

`CompleteRequest`

interface CompleteRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequest-method):“completion/complete”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequest-params):[CompleteRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams);

}

A request from the client to the server, to ask for completion options.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “completion/complete”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: CompleteRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams)

`CompleteRequestParams`

interface CompleteRequestParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[ref](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams-ref):[PromptReference](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptreference)|[ResourceTemplateReference](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplatereference);

[argument](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams-argument):{name:string;value:string};

[context](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams-context)?:{arguments?:{[key:string]:string}};

}

Parameters for a `completion/complete` request.

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from RequestParams._meta

ref: PromptReference | ResourceTemplateReference[](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams-ref)

argument: { name: string; value: string }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams-argument)

The argument’s information

Type Declaration

*   name: string The name of the argument 
*   value: string The value of the argument to use for completion matching. 

context?: { arguments?: { [key: string]: string } }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#completerequestparams-context)

Additional, optional context for completions

Type Declaration

*   `Optional`arguments?: {[key:string]:string} Previously-resolved variables in a URI template or prompt. 

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#completeresult)

`CompleteResult`

interface CompleteResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#completeresult-_meta)?:{[key:string]:unknown};

[completion](https://modelcontextprotocol.io/specification/2025-11-25/schema#completeresult-completion):{values:string[];total?:number;hasMore?:boolean};

[key:string]:unknown;

}

The server’s response to a completion/complete request

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#completeresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

completion: { values: string[]; total?: number; hasMore?: boolean }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#completeresult-completion)

Type Declaration

*   values: string[] An array of completion values. Must not exceed 100 items. 
*   `Optional`total?: number The total number of completion options available. This can exceed the number of values actually sent in the response. 
*   `Optional`hasMore?: boolean Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown. 

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptreference)

`PromptReference`

interface PromptReference{

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptreference-name):string;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptreference-title)?:string;

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptreference-type):“ref/prompt”;

}

Identifies a prompt.

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptreference-name)

Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn’t present).

Inherited from BaseMetadata.name

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptreference-title)

Intended for UI and end-user contexts — optimized to be human-readable and easily understood, even by those unfamiliar with domain-specific terminology.

If not provided, the name should be used for display (except for Tool, where `annotations.title` should be given precedence over using `name`, if present).

Inherited from BaseMetadata.title

type: “ref/prompt”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptreference-type)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplatereference)

`ResourceTemplateReference`

interface ResourceTemplateReference{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplatereference-type):“ref/resource”;

[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplatereference-uri):string;

}

A reference to a resource or resource template definition.

type: “ref/resource”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplatereference-type)

uri: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplatereference-uri)

The URI or URI template of the resource.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitation/create)

`elicitation/create`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequest)

`ElicitRequest`

interface ElicitRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequest-method):“elicitation/create”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequest-params):[ElicitRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestparams);

}

A request from the server to elicit additional information from the user via the client.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “elicitation/create”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: ElicitRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestparams)

`ElicitRequestParams`

ElicitRequestParams:[ElicitRequestFormParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams)|[ElicitRequestURLParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams)

The parameters for a request to elicit additional information from the user via the client.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitresult)

`ElicitResult`

interface ElicitResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitresult-_meta)?:{[key:string]:unknown};

[action](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitresult-action):“accept”|“decline”|“cancel”;

[content](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitresult-content)?:{[key:string]:string|number|boolean|string[]};

[key:string]:unknown;

}

The client’s response to an elicitation request.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

action: “accept” | “decline” | “cancel”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitresult-action)

The user action in response to the elicitation.

*   “accept”: User submitted the form/confirmed the action
*   “decline”: User explicitly decline the action
*   “cancel”: User dismissed without making an explicit choice

content?: { [key: string]: string | number | boolean | string[] }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitresult-content)

The submitted form data, only present when action is “accept” and mode was “form”. Contains values matching the requested schema. Omitted for out-of-band mode responses.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema)

`BooleanSchema`

interface BooleanSchema{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema-type):“boolean”;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema-description)?:string;

[default](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema-default)?:boolean;

}

type: “boolean”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema-type)

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema-title)

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema-description)

default?: boolean[](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema-default)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams)

`ElicitRequestFormParams`

interface ElicitRequestFormParams{

[task](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams-task)?:[TaskMetadata](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskmetadata);

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[mode](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams-mode)?:“form”;

[message](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams-message):string;

[requestedSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams-requestedschema):{

$schema?:string;

type:“object”;

properties:{[key:string]:[PrimitiveSchemaDefinition](https://modelcontextprotocol.io/specification/2025-11-25/schema#primitiveschemadefinition)};

required?:string[];

};

}

The parameters for a request to elicit non-sensitive information from the user via a form in the client.

task?: TaskMetadata[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams-task)

If specified, the caller is requesting task-augmented execution for this request. The request will return a CreateTaskResult immediately, and the actual result can be retrieved later via tasks/result.

Task augmentation is subject to capability negotiation - receivers MUST declare support for task augmentation of specific request types in their capabilities.

Inherited from TaskAugmentedRequestParams.task

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from TaskAugmentedRequestParams._meta

mode?: “form”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams-mode)

The elicitation mode.

message: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams-message)

The message to present to the user describing what information is being requested.

requestedSchema: { $schema?: string; type: “object”; properties: { [key: string]: PrimitiveSchemaDefinition }; required?: string[]; }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequestformparams-requestedschema)

A restricted subset of JSON Schema. Only top-level properties are allowed, without nesting.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams)

`ElicitRequestURLParams`

interface ElicitRequestURLParams{

[task](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-task)?:[TaskMetadata](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskmetadata);

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[mode](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-mode):“url”;

[message](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-message):string;

[elicitationId](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-elicitationid):string;

[url](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-url):string;

}

The parameters for a request to elicit information from the user via a URL in the client.

task?: TaskMetadata[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-task)

If specified, the caller is requesting task-augmented execution for this request. The request will return a CreateTaskResult immediately, and the actual result can be retrieved later via tasks/result.

Task augmentation is subject to capability negotiation - receivers MUST declare support for task augmentation of specific request types in their capabilities.

Inherited from TaskAugmentedRequestParams.task

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from TaskAugmentedRequestParams._meta

mode: “url”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-mode)

The elicitation mode.

message: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-message)

The message to present to the user explaining why the interaction is needed.

elicitationId: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-elicitationid)

The ID of the elicitation, which must be unique within the context of the server. The client MUST treat this ID as an opaque value.

url: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitrequesturlparams-url)

The URL that the user should navigate to.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#enumschema)

`EnumSchema`

EnumSchema:

|[SingleSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#singleselectenumschema)

|[MultiSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#multiselectenumschema)

|[LegacyTitledEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema)

`LegacyTitledEnumSchema`

interface LegacyTitledEnumSchema{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-type):“string”;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-description)?:string;

[enum](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-enum):string[];

[enumNames](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-enumnames)?:string[];

[default](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-default)?:string;

}

Use TitledSingleSelectEnumSchema instead. This interface will be removed in a future version.

type: “string”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-type)

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-title)

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-description)

enum: string[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-enum)

enumNames?: string[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-enumnames)

(Legacy) Display names for enum values. Non-standard according to JSON schema 2020-12.

default?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#legacytitledenumschema-default)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#multiselectenumschema)

`MultiSelectEnumSchema`

MultiSelectEnumSchema:

|[UntitledMultiSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema)

|[TitledMultiSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema)

`NumberSchema`

interface NumberSchema{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-type):“number”|“integer”;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-description)?:string;

[minimum](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-minimum)?:number;

[maximum](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-maximum)?:number;

[default](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-default)?:number;

}

type: “number” | “integer”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-type)

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-title)

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-description)

minimum?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-minimum)

maximum?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-maximum)

default?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema-default)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#primitiveschemadefinition)

`PrimitiveSchemaDefinition`

PrimitiveSchemaDefinition:

|[StringSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema)

|[NumberSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#numberschema)

|[BooleanSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#booleanschema)

|[EnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#enumschema)

Restricted schema definitions that only allow primitive types without nested objects or arrays.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#singleselectenumschema)

`SingleSelectEnumSchema`

SingleSelectEnumSchema:

|[UntitledSingleSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema)

|[TitledSingleSelectEnumSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema)

`StringSchema`

interface StringSchema{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-type):“string”;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-description)?:string;

[minLength](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-minlength)?:number;

[maxLength](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-maxlength)?:number;

[format](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-format)?:“uri”|“email”|“date”|“date-time”;

[default](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-default)?:string;

}

type: “string”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-type)

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-title)

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-description)

minLength?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-minlength)

maxLength?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-maxlength)

format?: “uri” | “email” | “date” | “date-time”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-format)

default?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#stringschema-default)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema)

`TitledMultiSelectEnumSchema`

interface TitledMultiSelectEnumSchema{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-type):“array”;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-description)?:string;

[minItems](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-minitems)?:number;

[maxItems](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-maxitems)?:number;

[items](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-items):{anyOf:{const:string;title:string}[]};

[default](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-default)?:string[];

}

Schema for multiple-selection enumeration with display titles for each option.

type: “array”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-type)

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-title)

Optional title for the enum field.

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-description)

Optional description for the enum field.

minItems?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-minitems)

Minimum number of items to select.

maxItems?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-maxitems)

Maximum number of items to select.

items: { anyOf: { const: string; title: string }[] }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-items)

Schema for array items with enum options and display labels.

Type Declaration

*   anyOf: {const:string;title:string}[] Array of enum options with values and display labels. 

default?: string[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledmultiselectenumschema-default)

Optional default value.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema)

`TitledSingleSelectEnumSchema`

interface TitledSingleSelectEnumSchema{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema-type):“string”;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema-description)?:string;

[oneOf](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema-oneof):{const:string;title:string}[];

[default](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema-default)?:string;

}

Schema for single-selection enumeration with display titles for each option.

type: “string”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema-type)

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema-title)

Optional title for the enum field.

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema-description)

Optional description for the enum field.

oneOf: { const: string; title: string }[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema-oneof)

Array of enum options with values and display labels.

Type Declaration

*   const: string The enum value. 
*   title: string Display label for this option. 

default?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#titledsingleselectenumschema-default)

Optional default value.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema)

`UntitledMultiSelectEnumSchema`

interface UntitledMultiSelectEnumSchema{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-type):“array”;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-description)?:string;

[minItems](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-minitems)?:number;

[maxItems](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-maxitems)?:number;

[items](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-items):{type:“string”;enum:string[]};

[default](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-default)?:string[];

}

Schema for multiple-selection enumeration without display titles for options.

type: “array”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-type)

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-title)

Optional title for the enum field.

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-description)

Optional description for the enum field.

minItems?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-minitems)

Minimum number of items to select.

maxItems?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-maxitems)

Maximum number of items to select.

items: { type: “string”; enum: string[] }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-items)

Schema for the array items.

Type Declaration

*   type: “string” 
*   enum: string[] Array of enum values to choose from. 

default?: string[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledmultiselectenumschema-default)

Optional default value.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema)

`UntitledSingleSelectEnumSchema`

interface UntitledSingleSelectEnumSchema{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema-type):“string”;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema-description)?:string;

[enum](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema-enum):string[];

[default](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema-default)?:string;

}

Schema for single-selection enumeration without display titles for options.

type: “string”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema-type)

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema-title)

Optional title for the enum field.

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema-description)

Optional description for the enum field.

enum: string[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema-enum)

Array of enum values to choose from.

default?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#untitledsingleselectenumschema-default)

Optional default value.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#initialize)

`initialize`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequest)

`InitializeRequest`

interface InitializeRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequest-method):“initialize”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequest-params):[InitializeRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams);

}

This request is sent from the client to the server when it first connects, asking it to begin initialization.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “initialize”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: InitializeRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams)

`InitializeRequestParams`

interface InitializeRequestParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[protocolVersion](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams-protocolversion):string;

[capabilities](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams-capabilities):[ClientCapabilities](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities);

[clientInfo](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams-clientinfo):[Implementation](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation);

}

Parameters for an `initialize` request.

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from RequestParams._meta

protocolVersion: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams-protocolversion)

The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.

capabilities: ClientCapabilities[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams-capabilities)

clientInfo: Implementation[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializerequestparams-clientinfo)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult)

`InitializeResult`

interface InitializeResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult-_meta)?:{[key:string]:unknown};

[protocolVersion](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult-protocolversion):string;

[capabilities](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult-capabilities):[ServerCapabilities](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities);

[serverInfo](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult-serverinfo):[Implementation](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation);

[instructions](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult-instructions)?:string;

[key:string]:unknown;

}

After receiving an initialize request from the client, the server sends this response.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

protocolVersion: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult-protocolversion)

The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.

capabilities: ServerCapabilities[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult-capabilities)

serverInfo: Implementation[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult-serverinfo)

instructions?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializeresult-instructions)

Instructions describing how to use the server and its features.

This can be used by clients to improve the LLM’s understanding of available tools, resources, etc. It can be thought of like a “hint” to the model. For example, this information MAY be added to the system prompt.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities)

`ClientCapabilities`

interface ClientCapabilities{

[experimental](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities-experimental)?:{[key:string]:object};

[roots](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities-roots)?:{listChanged?:boolean};

[sampling](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities-sampling)?:{context?:object;tools?:object};

[elicitation](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities-elicitation)?:{form?:object;url?:object};

[tasks](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities-tasks)?:{

list?:object;

cancel?:object;

requests?:{

sampling?:{createMessage?:object};

elicitation?:{create?:object};

};

};

}

Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.

experimental?: { [key: string]: object }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities-experimental)

Experimental, non-standard capabilities that the client supports.

roots?: { listChanged?: boolean }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities-roots)

Present if the client supports listing roots.

Type Declaration

*   `Optional`listChanged?: boolean Whether the client supports notifications for changes to the roots list. 

sampling?: { context?: object; tools?: object }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities-sampling)

Present if the client supports sampling from an LLM.

Type Declaration

*   `Optional`context?: object Whether the client supports context inclusion via includeContext parameter. If not declared, servers SHOULD only use `includeContext: “none”` (or omit it). 
*   `Optional`tools?: object Whether the client supports tool use via tools and toolChoice parameters. 

elicitation?: { form?: object; url?: object }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities-elicitation)

Present if the client supports elicitation from the server.

tasks?: { list?: object; cancel?: object; requests?: { sampling?: { createMessage?: object }; elicitation?: { create?: object }; }; }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#clientcapabilities-tasks)

Present if the client supports task-augmented requests.

Type Declaration

*   `Optional`list?: object Whether this client supports tasks/list. 
*   `Optional`cancel?: object Whether this client supports tasks/cancel. 
*   `Optional`requests?: {sampling?:{createMessage?:object};elicitation?:{create?:object}} Specifies which request types can be augmented with tasks. 
    *   `Optional`sampling?: {createMessage?:object} Task support for sampling-related requests. 
        *   `Optional`createMessage?: object Whether the client supports task-augmented sampling/createMessage requests. 

    *   `Optional`elicitation?: {create?:object} Task support for elicitation-related requests. 
        *   `Optional`create?: object Whether the client supports task-augmented elicitation/create requests. 

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation)

`Implementation`

interface Implementation{

[icons](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-icons)?:[Icon](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon)[];

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-name):string;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-title)?:string;

[version](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-version):string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-description)?:string;

[websiteUrl](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-websiteurl)?:string;

}

Describes the MCP implementation.

icons?: Icon[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-icons)

Optional set of sized icons that the client can display in a user interface.

Clients that support rendering icons MUST support at least the following MIME types:

*   `image/png` - PNG images (safe, universal compatibility)
*   `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)

Clients that support rendering icons SHOULD also support:

*   `image/svg+xml` - SVG images (scalable but requires security precautions)
*   `image/webp` - WebP images (modern, efficient format)

Inherited from Icons.icons

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-name)

Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn’t present).

Inherited from BaseMetadata.name

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-title)

Intended for UI and end-user contexts — optimized to be human-readable and easily understood, even by those unfamiliar with domain-specific terminology.

If not provided, the name should be used for display (except for Tool, where `annotations.title` should be given precedence over using `name`, if present).

Inherited from BaseMetadata.title

version: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-version)

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-description)

An optional human-readable description of what this implementation does.

This can be used by clients or servers to provide context about their purpose and capabilities. For example, a server might describe the types of resources or tools it provides, while a client might describe its intended use case.

websiteUrl?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation-websiteurl)

An optional URL of the website for this implementation.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities)

`ServerCapabilities`

interface ServerCapabilities{

[experimental](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-experimental)?:{[key:string]:object};

[logging](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-logging)?:object;

[completions](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-completions)?:object;

[prompts](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-prompts)?:{listChanged?:boolean};

[resources](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-resources)?:{subscribe?:boolean;listChanged?:boolean};

[tools](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-tools)?:{listChanged?:boolean};

[tasks](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-tasks)?:{

list?:object;

cancel?:object;

requests?:{tools?:{call?:object}};

};

}

Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.

experimental?: { [key: string]: object }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-experimental)

Experimental, non-standard capabilities that the server supports.

logging?: object[](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-logging)

Present if the server supports sending log messages to the client.

completions?: object[](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-completions)

Present if the server supports argument autocompletion suggestions.

prompts?: { listChanged?: boolean }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-prompts)

Present if the server offers any prompt templates.

Type Declaration

*   `Optional`listChanged?: boolean Whether this server supports notifications for changes to the prompt list. 

resources?: { subscribe?: boolean; listChanged?: boolean }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-resources)

Present if the server offers any resources to read.

Type Declaration

*   `Optional`subscribe?: boolean Whether this server supports subscribing to resource updates. 
*   `Optional`listChanged?: boolean Whether this server supports notifications for changes to the resource list. 

tools?: { listChanged?: boolean }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-tools)

Present if the server offers any tools to call.

Type Declaration

*   `Optional`listChanged?: boolean Whether this server supports notifications for changes to the tool list. 

tasks?: { list?: object; cancel?: object; requests?: { tools?: { call?: object } }; }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#servercapabilities-tasks)

Present if the server supports task-augmented requests.

Type Declaration

*   `Optional`list?: object Whether this server supports tasks/list. 
*   `Optional`cancel?: object Whether this server supports tasks/cancel. 
*   `Optional`requests?: {tools?:{call?:object}} Specifies which request types can be augmented with tasks. 
    *   `Optional`tools?: {call?:object} Task support for tool-related requests. 
        *   `Optional`call?: object Whether the server supports task-augmented tools/call requests. 

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#logging/setlevel)

`logging/setLevel`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequest)

`SetLevelRequest`

interface SetLevelRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequest-method):“logging/setLevel”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequest-params):[SetLevelRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequestparams);

}

A request from the client to the server, to enable or adjust logging.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “logging/setLevel”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: SetLevelRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequestparams)

`SetLevelRequestParams`

interface SetLevelRequestParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequestparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[level](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequestparams-level):[LoggingLevel](https://modelcontextprotocol.io/specification/2025-11-25/schema#logginglevel);

}

Parameters for a `logging/setLevel` request.

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequestparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from RequestParams._meta

level: LoggingLevel[](https://modelcontextprotocol.io/specification/2025-11-25/schema#setlevelrequestparams-level)

The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/message.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/cancelled)

`notifications/cancelled`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotification)

`CancelledNotification`

interface CancelledNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotification-method):“notifications/cancelled”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotification-params):[CancelledNotificationParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotificationparams);

}

This notification can be sent by either side to indicate that it is cancelling a previously-issued request.

The request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.

This notification indicates that the result will be unused, so any associated processing SHOULD cease.

A client MUST NOT attempt to cancel its `initialize` request.

For task cancellation, use the `tasks/cancel` request instead of this notification.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/cancelled”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params: CancelledNotificationParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotification-params)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotificationparams)

`CancelledNotificationParams`

interface CancelledNotificationParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotificationparams-_meta)?:{[key:string]:unknown};

[requestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotificationparams-requestid)?:[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[reason](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotificationparams-reason)?:string;

}

Parameters for a `notifications/cancelled` notification.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotificationparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from NotificationParams._meta

requestId?: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotificationparams-requestid)

The ID of the request to cancel.

This MUST correspond to the ID of a request previously issued in the same direction. This MUST be provided for cancelling non-task requests. This MUST NOT be used for cancelling tasks (use the `tasks/cancel` request instead).

reason?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#cancellednotificationparams-reason)

An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/initialized)

`notifications/initialized`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializednotification)

`InitializedNotification`

interface InitializedNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializednotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializednotification-method):“notifications/initialized”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializednotification-params)?:NotificationParams;

}

This notification is sent from the client to the server after initialization has finished.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializednotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/initialized”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializednotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params?: NotificationParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#initializednotification-params)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/tasks/status)

`notifications/tasks/status`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotification)

`TaskStatusNotification`

interface TaskStatusNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotification-method):“notifications/tasks/status”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotification-params):[TaskStatusNotificationParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotificationparams);

}

An optional notification from the receiver to the requestor, informing them that a task’s status has changed. Receivers are not required to send these notifications.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/tasks/status”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params: TaskStatusNotificationParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotification-params)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatusnotificationparams)

`TaskStatusNotificationParams`

TaskStatusNotificationParams:NotificationParams&[Task](https://modelcontextprotocol.io/specification/2025-11-25/schema#task)

Parameters for a `notifications/tasks/status` notification.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/message)

`notifications/message`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotification)

`LoggingMessageNotification`

interface LoggingMessageNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotification-method):“notifications/message”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotification-params):[LoggingMessageNotificationParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams);

}

JSONRPCNotification of a log message passed from server to client. If no logging/setLevel request has been sent from the client, the server MAY decide which messages to send automatically.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/message”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params: LoggingMessageNotificationParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotification-params)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams)

`LoggingMessageNotificationParams`

interface LoggingMessageNotificationParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams-_meta)?:{[key:string]:unknown};

[level](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams-level):[LoggingLevel](https://modelcontextprotocol.io/specification/2025-11-25/schema#logginglevel);

[logger](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams-logger)?:string;

[data](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams-data):unknown;

}

Parameters for a `notifications/message` notification.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from NotificationParams._meta

level: LoggingLevel[](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams-level)

The severity of this log message.

logger?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams-logger)

An optional name of the logger issuing this message.

data: unknown[](https://modelcontextprotocol.io/specification/2025-11-25/schema#loggingmessagenotificationparams-data)

The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/progress)

`notifications/progress`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotification)

`ProgressNotification`

interface ProgressNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotification-method):“notifications/progress”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotification-params):[ProgressNotificationParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams);

}

An out-of-band notification used to inform the receiver of a progress update for a long-running request.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/progress”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params: ProgressNotificationParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotification-params)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams)

`ProgressNotificationParams`

interface ProgressNotificationParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams-_meta)?:{[key:string]:unknown};

[progressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams-progresstoken):[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);

[progress](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams-progress):number;

[total](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams-total)?:number;

[message](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams-message)?:string;

}

Parameters for a `notifications/progress` notification.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from NotificationParams._meta

progressToken: ProgressToken[](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams-progresstoken)

The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.

progress: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams-progress)

The progress thus far. This should increase every time progress is made, even if the total is unknown.

total?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams-total)

Total number of items to process (or total progress required), if known.

message?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#progressnotificationparams-message)

An optional message describing the current progress.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/prompts/list_changed)

`notifications/prompts/list_changed`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptlistchangednotification)

`PromptListChangedNotification`

interface PromptListChangedNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptlistchangednotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptlistchangednotification-method):“notifications/prompts/list_changed”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptlistchangednotification-params)?:NotificationParams;

}

An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptlistchangednotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/prompts/list_changed”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptlistchangednotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params?: NotificationParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptlistchangednotification-params)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/resources/list_changed)

`notifications/resources/list_changed`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelistchangednotification)

`ResourceListChangedNotification`

interface ResourceListChangedNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelistchangednotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelistchangednotification-method):“notifications/resources/list_changed”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelistchangednotification-params)?:NotificationParams;

}

An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelistchangednotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/resources/list_changed”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelistchangednotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params?: NotificationParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcelistchangednotification-params)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/resources/updated)

`notifications/resources/updated`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotification)

`ResourceUpdatedNotification`

interface ResourceUpdatedNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotification-method):“notifications/resources/updated”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotification-params):[ResourceUpdatedNotificationParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotificationparams);

}

A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a resources/subscribe request.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/resources/updated”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params: ResourceUpdatedNotificationParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotification-params)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotificationparams)

`ResourceUpdatedNotificationParams`

interface ResourceUpdatedNotificationParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotificationparams-_meta)?:{[key:string]:unknown};

[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotificationparams-uri):string;

}

Parameters for a `notifications/resources/updated` notification.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotificationparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from NotificationParams._meta

uri: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourceupdatednotificationparams-uri)

The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/roots/list_changed)

`notifications/roots/list_changed`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#rootslistchangednotification)

`RootsListChangedNotification`

interface RootsListChangedNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#rootslistchangednotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#rootslistchangednotification-method):“notifications/roots/list_changed”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#rootslistchangednotification-params)?:NotificationParams;

}

A notification from the client to the server, informing it that the list of roots has changed. This notification should be sent whenever the client adds, removes, or modifies any root. The server should then request an updated list of roots using the ListRootsRequest.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#rootslistchangednotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/roots/list_changed”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#rootslistchangednotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params?: NotificationParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#rootslistchangednotification-params)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/tools/list_changed)

`notifications/tools/list_changed`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#toollistchangednotification)

`ToolListChangedNotification`

interface ToolListChangedNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#toollistchangednotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#toollistchangednotification-method):“notifications/tools/list_changed”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#toollistchangednotification-params)?:NotificationParams;

}

An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toollistchangednotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/tools/list_changed”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toollistchangednotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params?: NotificationParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toollistchangednotification-params)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#notifications/elicitation/complete)

`notifications/elicitation/complete`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitationcompletenotification)

`ElicitationCompleteNotification`

interface ElicitationCompleteNotification{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitationcompletenotification-jsonrpc):“2.0”;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitationcompletenotification-method):“notifications/elicitation/complete”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitationcompletenotification-params):{elicitationId:string};

}

An optional notification from the server to the client, informing it of a completion of a out-of-band elicitation request.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitationcompletenotification-jsonrpc)

Inherited from [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-jsonrpc)

method: “notifications/elicitation/complete”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitationcompletenotification-method)

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-method)

params: { elicitationId: string }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#elicitationcompletenotification-params)

Type Declaration

*   elicitationId: string The ID of the elicitation that completed. 

Overrides [JSONRPCNotification](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcnotification-params)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#ping)

`ping`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#pingrequest)

`PingRequest`

interface PingRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#pingrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#pingrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#pingrequest-method):“ping”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#pingrequest-params)?:RequestParams;

}

A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#pingrequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#pingrequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “ping”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#pingrequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params?: RequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#pingrequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#tasks)

`tasks`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#createtaskresult)

`CreateTaskResult`

interface CreateTaskResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#createtaskresult-_meta)?:{[key:string]:unknown};

[task](https://modelcontextprotocol.io/specification/2025-11-25/schema#createtaskresult-task):[Task](https://modelcontextprotocol.io/specification/2025-11-25/schema#task);

[key:string]:unknown;

}

A response to a task-augmented request.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createtaskresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

task: Task[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createtaskresult-task)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#relatedtaskmetadata)

`RelatedTaskMetadata`

interface RelatedTaskMetadata{

[taskId](https://modelcontextprotocol.io/specification/2025-11-25/schema#relatedtaskmetadata-taskid):string;

}

Metadata for associating messages with a task. Include this in the `_meta` field under the key `io.modelcontextprotocol/related-task`.

taskId: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#relatedtaskmetadata-taskid)

The task identifier this message is associated with.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#task)

`Task`

interface Task{

[taskId](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-taskid):string;

[status](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-status):[TaskStatus](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatus);

[statusMessage](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-statusmessage)?:string;

[createdAt](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-createdat):string;

[lastUpdatedAt](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-lastupdatedat):string;

[ttl](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-ttl):number|null;

[pollInterval](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-pollinterval)?:number;

}

Data associated with a task.

taskId: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-taskid)

The task identifier.

status: TaskStatus[](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-status)

Current task state.

statusMessage?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-statusmessage)

Optional human-readable message describing the current task state. This can provide context for any status, including:

*   Reasons for “cancelled” status
*   Summaries for “completed” status
*   Diagnostic information for “failed” status (e.g., error details, what went wrong)

createdAt: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-createdat)

ISO 8601 timestamp when the task was created.

lastUpdatedAt: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-lastupdatedat)

ISO 8601 timestamp when the task was last updated.

ttl: number | null[](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-ttl)

Actual retention duration from creation in milliseconds, null for unlimited.

pollInterval?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#task-pollinterval)

Suggested polling interval in milliseconds.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskmetadata)

`TaskMetadata`

interface TaskMetadata{

[ttl](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskmetadata-ttl)?:number;

}

Metadata for augmenting a request with task execution. Include this in the `task` field of the request parameters.

ttl?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskmetadata-ttl)

Requested duration in milliseconds to retain task from creation.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskstatus)

`TaskStatus`

TaskStatus:“working”|“input_required”|“completed”|“failed”|“cancelled”

The status of a task.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#tasks/get)

`tasks/get`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskrequest)

`GetTaskRequest`

interface GetTaskRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskrequest-method):“tasks/get”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskrequest-params):{taskId:string};

}

A request to retrieve the state of a task.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskrequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskrequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “tasks/get”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskrequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: { taskId: string }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskrequest-params)

Type Declaration

*   taskId: string The task identifier to query. 

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskresult)

`GetTaskResult`

GetTaskResult:[Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result)&[Task](https://modelcontextprotocol.io/specification/2025-11-25/schema#task)

The response to a tasks/get request.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#tasks/result)

`tasks/result`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadrequest)

`GetTaskPayloadRequest`

interface GetTaskPayloadRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadrequest-method):“tasks/result”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadrequest-params):{taskId:string};

}

A request to retrieve the result of a completed task.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadrequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadrequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “tasks/result”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadrequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: { taskId: string }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadrequest-params)

Type Declaration

*   taskId: string The task identifier to retrieve results for. 

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadresult)

`GetTaskPayloadResult`

interface GetTaskPayloadResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadresult-_meta)?:{[key:string]:unknown};

[key:string]:unknown;

}

The response to a tasks/result request. The structure matches the result type of the original request. For example, a tools/call task would return the CallToolResult structure.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#gettaskpayloadresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#tasks/list)

`tasks/list`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksrequest)

`ListTasksRequest`

interface ListTasksRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksrequest-params)?:PaginatedRequestParams;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksrequest-method):“tasks/list”;

}

A request to retrieve a list of tasks.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksrequest-jsonrpc)

Inherited from PaginatedRequest.jsonrpc

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksrequest-id)

Inherited from PaginatedRequest.id

params?: PaginatedRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksrequest-params)

Inherited from PaginatedRequest.params

method: “tasks/list”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksrequest-method)

Overrides PaginatedRequest.method

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksresult)

`ListTasksResult`

interface ListTasksResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksresult-_meta)?:{[key:string]:unknown};

[nextCursor](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksresult-nextcursor)?:string;

[tasks](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksresult-tasks):[Task](https://modelcontextprotocol.io/specification/2025-11-25/schema#task)[];

[key:string]:unknown;

}

The response to a tasks/list request.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from PaginatedResult._meta

nextCursor?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksresult-nextcursor)

An opaque token representing the pagination position after the last returned result. If present, there may be more results available.

Inherited from PaginatedResult.nextCursor

tasks: Task[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtasksresult-tasks)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#tasks/cancel)

`tasks/cancel`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskrequest)

`CancelTaskRequest`

interface CancelTaskRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskrequest-method):“tasks/cancel”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskrequest-params):{taskId:string};

}

A request to cancel a task.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskrequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskrequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “tasks/cancel”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskrequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: { taskId: string }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskrequest-params)

Type Declaration

*   taskId: string The task identifier to cancel. 

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#canceltaskresult)

`CancelTaskResult`

CancelTaskResult:[Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result)&[Task](https://modelcontextprotocol.io/specification/2025-11-25/schema#task)

The response to a tasks/cancel request.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompts/get)

`prompts/get`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequest)

`GetPromptRequest`

interface GetPromptRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequest-method):“prompts/get”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequest-params):[GetPromptRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequestparams);

}

Used by the client to get a prompt provided by the server.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “prompts/get”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: GetPromptRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequestparams)

`GetPromptRequestParams`

interface GetPromptRequestParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequestparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequestparams-name):string;

[arguments](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequestparams-arguments)?:{[key:string]:string};

}

Parameters for a `prompts/get` request.

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequestparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from RequestParams._meta

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequestparams-name)

The name of the prompt or prompt template.

arguments?: { [key: string]: string }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptrequestparams-arguments)

Arguments to use for templating the prompt.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptresult)

`GetPromptResult`

interface GetPromptResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptresult-_meta)?:{[key:string]:unknown};

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptresult-description)?:string;

[messages](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptresult-messages):[PromptMessage](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptmessage)[];

[key:string]:unknown;

}

The server’s response to a prompts/get request from the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptresult-description)

An optional description for the prompt.

messages: PromptMessage[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#getpromptresult-messages)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptmessage)

`PromptMessage`

interface PromptMessage{

[role](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptmessage-role):[Role](https://modelcontextprotocol.io/specification/2025-11-25/schema#role);

[content](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptmessage-content):[ContentBlock](https://modelcontextprotocol.io/specification/2025-11-25/schema#contentblock);

}

Describes a message returned as part of a prompt.

This is similar to `SamplingMessage`, but also supports the embedding of resources from the MCP server.

role: Role[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptmessage-role)

content: ContentBlock[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptmessage-content)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompts/list)

`prompts/list`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsrequest)

`ListPromptsRequest`

interface ListPromptsRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsrequest-params)?:PaginatedRequestParams;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsrequest-method):“prompts/list”;

}

Sent from the client to request a list of prompts and prompt templates the server has.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsrequest-jsonrpc)

Inherited from PaginatedRequest.jsonrpc

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsrequest-id)

Inherited from PaginatedRequest.id

params?: PaginatedRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsrequest-params)

Inherited from PaginatedRequest.params

method: “prompts/list”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsrequest-method)

Overrides PaginatedRequest.method

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsresult)

`ListPromptsResult`

interface ListPromptsResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsresult-_meta)?:{[key:string]:unknown};

[nextCursor](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsresult-nextcursor)?:string;

[prompts](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsresult-prompts):[Prompt](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt)[];

[key:string]:unknown;

}

The server’s response to a prompts/list request from the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from PaginatedResult._meta

nextCursor?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsresult-nextcursor)

An opaque token representing the pagination position after the last returned result. If present, there may be more results available.

Inherited from PaginatedResult.nextCursor

prompts: Prompt[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#listpromptsresult-prompts)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt)

`Prompt`

interface Prompt{

[icons](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-icons)?:[Icon](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon)[];

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-name):string;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-description)?:string;

[arguments](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-arguments)?:[PromptArgument](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument)[];

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-_meta)?:{[key:string]:unknown};

}

A prompt or prompt template that the server offers.

icons?: Icon[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-icons)

Optional set of sized icons that the client can display in a user interface.

Clients that support rendering icons MUST support at least the following MIME types:

*   `image/png` - PNG images (safe, universal compatibility)
*   `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)

Clients that support rendering icons SHOULD also support:

*   `image/svg+xml` - SVG images (scalable but requires security precautions)
*   `image/webp` - WebP images (modern, efficient format)

Inherited from Icons.icons

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-name)

Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn’t present).

Inherited from BaseMetadata.name

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-title)

Intended for UI and end-user contexts — optimized to be human-readable and easily understood, even by those unfamiliar with domain-specific terminology.

If not provided, the name should be used for display (except for Tool, where `annotations.title` should be given precedence over using `name`, if present).

Inherited from BaseMetadata.title

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-description)

An optional description of what this prompt provides

arguments?: PromptArgument[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-arguments)

A list of arguments to use for templating the prompt.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#prompt-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument)

`PromptArgument`

interface PromptArgument{

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument-name):string;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument-description)?:string;

[required](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument-required)?:boolean;

}

Describes an argument that a prompt can accept.

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument-name)

Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn’t present).

Inherited from BaseMetadata.name

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument-title)

Intended for UI and end-user contexts — optimized to be human-readable and easily understood, even by those unfamiliar with domain-specific terminology.

If not provided, the name should be used for display (except for Tool, where `annotations.title` should be given precedence over using `name`, if present).

Inherited from BaseMetadata.title

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument-description)

A human-readable description of the argument.

required?: boolean[](https://modelcontextprotocol.io/specification/2025-11-25/schema#promptargument-required)

Whether this argument must be provided.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resources/list)

`resources/list`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesrequest)

`ListResourcesRequest`

interface ListResourcesRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesrequest-params)?:PaginatedRequestParams;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesrequest-method):“resources/list”;

}

Sent from the client to request a list of resources the server has.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesrequest-jsonrpc)

Inherited from PaginatedRequest.jsonrpc

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesrequest-id)

Inherited from PaginatedRequest.id

params?: PaginatedRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesrequest-params)

Inherited from PaginatedRequest.params

method: “resources/list”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesrequest-method)

Overrides PaginatedRequest.method

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesresult)

`ListResourcesResult`

interface ListResourcesResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesresult-_meta)?:{[key:string]:unknown};

[nextCursor](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesresult-nextcursor)?:string;

[resources](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesresult-resources):[Resource](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource)[];

[key:string]:unknown;

}

The server’s response to a resources/list request from the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from PaginatedResult._meta

nextCursor?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesresult-nextcursor)

An opaque token representing the pagination position after the last returned result. If present, there may be more results available.

Inherited from PaginatedResult.nextCursor

resources: Resource[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcesresult-resources)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource)

`Resource`

interface Resource{

[icons](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-icons)?:[Icon](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon)[];

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-name):string;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-title)?:string;

[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-uri):string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-description)?:string;

[mimeType](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-mimetype)?:string;

[annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-annotations)?:[Annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations);

[size](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-size)?:number;

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-_meta)?:{[key:string]:unknown};

}

A known resource that the server is capable of reading.

icons?: Icon[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-icons)

Optional set of sized icons that the client can display in a user interface.

Clients that support rendering icons MUST support at least the following MIME types:

*   `image/png` - PNG images (safe, universal compatibility)
*   `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)

Clients that support rendering icons SHOULD also support:

*   `image/svg+xml` - SVG images (scalable but requires security precautions)
*   `image/webp` - WebP images (modern, efficient format)

Inherited from Icons.icons

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-name)

Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn’t present).

Inherited from BaseMetadata.name

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-title)

Intended for UI and end-user contexts — optimized to be human-readable and easily understood, even by those unfamiliar with domain-specific terminology.

If not provided, the name should be used for display (except for Tool, where `annotations.title` should be given precedence over using `name`, if present).

Inherited from BaseMetadata.title

uri: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-uri)

The URI of this resource.

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-description)

A description of what this resource represents.

This can be used by clients to improve the LLM’s understanding of available resources. It can be thought of like a “hint” to the model.

mimeType?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-mimetype)

The MIME type of this resource, if known.

annotations?: Annotations[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-annotations)

Optional annotations for the client.

size?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-size)

The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.

This can be used by Hosts to display file sizes and estimate context window usage.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resource-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resources/read)

`resources/read`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequest)

`ReadResourceRequest`

interface ReadResourceRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequest-method):“resources/read”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequest-params):[ReadResourceRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequestparams);

}

Sent from the client to the server, to read a specific resource URI.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “resources/read”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: ReadResourceRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequestparams)

`ReadResourceRequestParams`

interface ReadResourceRequestParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequestparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequestparams-uri):string;

}

Parameters for a `resources/read` request.

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequestparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from ResourceRequestParams._meta

uri: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourcerequestparams-uri)

The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.

Inherited from ResourceRequestParams.uri

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourceresult)

`ReadResourceResult`

interface ReadResourceResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourceresult-_meta)?:{[key:string]:unknown};

[contents](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourceresult-contents): ([TextResourceContents](https://modelcontextprotocol.io/specification/2025-11-25/schema#textresourcecontents)|[BlobResourceContents](https://modelcontextprotocol.io/specification/2025-11-25/schema#blobresourcecontents))[];

[key:string]:unknown;

}

The server’s response to a resources/read request from the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourceresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

contents: (TextResourceContents | BlobResourceContents)[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#readresourceresult-contents)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resources/subscribe)

`resources/subscribe`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequest)

`SubscribeRequest`

interface SubscribeRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequest-method):“resources/subscribe”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequest-params):[SubscribeRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequestparams);

}

Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “resources/subscribe”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: SubscribeRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequestparams)

`SubscribeRequestParams`

interface SubscribeRequestParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequestparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequestparams-uri):string;

}

Parameters for a `resources/subscribe` request.

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequestparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from ResourceRequestParams._meta

uri: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#subscriberequestparams-uri)

The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.

Inherited from ResourceRequestParams.uri

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resources/templates/list)

`resources/templates/list`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesrequest)

`ListResourceTemplatesRequest`

interface ListResourceTemplatesRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesrequest-params)?:PaginatedRequestParams;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesrequest-method):“resources/templates/list”;

}

Sent from the client to request a list of resource templates the server has.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesrequest-jsonrpc)

Inherited from PaginatedRequest.jsonrpc

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesrequest-id)

Inherited from PaginatedRequest.id

params?: PaginatedRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesrequest-params)

Inherited from PaginatedRequest.params

method: “resources/templates/list”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesrequest-method)

Overrides PaginatedRequest.method

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesresult)

`ListResourceTemplatesResult`

interface ListResourceTemplatesResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesresult-_meta)?:{[key:string]:unknown};

[nextCursor](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesresult-nextcursor)?:string;

[resourceTemplates](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesresult-resourcetemplates):[ResourceTemplate](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate)[];

[key:string]:unknown;

}

The server’s response to a resources/templates/list request from the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from PaginatedResult._meta

nextCursor?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesresult-nextcursor)

An opaque token representing the pagination position after the last returned result. If present, there may be more results available.

Inherited from PaginatedResult.nextCursor

resourceTemplates: ResourceTemplate[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#listresourcetemplatesresult-resourcetemplates)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate)

`ResourceTemplate`

interface ResourceTemplate{

[icons](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-icons)?:[Icon](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon)[];

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-name):string;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-title)?:string;

[uriTemplate](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-uritemplate):string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-description)?:string;

[mimeType](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-mimetype)?:string;

[annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-annotations)?:[Annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#annotations);

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-_meta)?:{[key:string]:unknown};

}

A template description for resources available on the server.

icons?: Icon[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-icons)

Optional set of sized icons that the client can display in a user interface.

Clients that support rendering icons MUST support at least the following MIME types:

*   `image/png` - PNG images (safe, universal compatibility)
*   `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)

Clients that support rendering icons SHOULD also support:

*   `image/svg+xml` - SVG images (scalable but requires security precautions)
*   `image/webp` - WebP images (modern, efficient format)

Inherited from Icons.icons

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-name)

Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn’t present).

Inherited from BaseMetadata.name

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-title)

Intended for UI and end-user contexts — optimized to be human-readable and easily understood, even by those unfamiliar with domain-specific terminology.

If not provided, the name should be used for display (except for Tool, where `annotations.title` should be given precedence over using `name`, if present).

Inherited from BaseMetadata.title

uriTemplate: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-uritemplate)

A URI template (according to RFC 6570) that can be used to construct resource URIs.

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-description)

A description of what this template is for.

This can be used by clients to improve the LLM’s understanding of available resources. It can be thought of like a “hint” to the model.

mimeType?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-mimetype)

The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.

annotations?: Annotations[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-annotations)

Optional annotations for the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#resourcetemplate-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#resources/unsubscribe)

`resources/unsubscribe`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequest)

`UnsubscribeRequest`

interface UnsubscribeRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequest-method):“resources/unsubscribe”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequest-params):[UnsubscribeRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequestparams);

}

Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “resources/unsubscribe”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: UnsubscribeRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequestparams)

`UnsubscribeRequestParams`

interface UnsubscribeRequestParams{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequestparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequestparams-uri):string;

}

Parameters for a `resources/unsubscribe` request.

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequestparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from ResourceRequestParams._meta

uri: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#unsubscriberequestparams-uri)

The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.

Inherited from ResourceRequestParams.uri

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#roots/list)

`roots/list`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsrequest)

`ListRootsRequest`

interface ListRootsRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsrequest-method):“roots/list”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsrequest-params)?:RequestParams;

}

Sent from the server to request a list of root URIs from the client. Roots allow servers to ask for specific directories or files to operate on. A common example for roots is providing a set of repositories or directories a server should operate on.

This request is typically used when the server needs to understand the file system structure or access specific locations that the client has permission to read from.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsrequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsrequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “roots/list”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsrequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params?: RequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsrequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsresult)

`ListRootsResult`

interface ListRootsResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsresult-_meta)?:{[key:string]:unknown};

[roots](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsresult-roots):[Root](https://modelcontextprotocol.io/specification/2025-11-25/schema#root)[];

[key:string]:unknown;

}

The client’s response to a roots/list request from the server. This result contains an array of Root objects, each representing a root directory or file that the server can operate on.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

roots: Root[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#listrootsresult-roots)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#root)

`Root`

interface Root{

[uri](https://modelcontextprotocol.io/specification/2025-11-25/schema#root-uri):string;

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#root-name)?:string;

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#root-_meta)?:{[key:string]:unknown};

}

Represents a root directory or file that the server can operate on.

uri: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#root-uri)

The URI identifying the root. This _must_ start with file:// for now. This restriction may be relaxed in future versions of the protocol to allow other URI schemes.

name?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#root-name)

An optional name for the root. This can be used to provide a human-readable identifier for the root, which may be useful for display purposes or for referencing the root in other parts of the application.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#root-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#sampling/createmessage)

`sampling/createMessage`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequest)

`CreateMessageRequest`

interface CreateMessageRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequest-method):“sampling/createMessage”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequest-params):[CreateMessageRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams);

}

A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “sampling/createMessage”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: CreateMessageRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams)

`CreateMessageRequestParams`

interface CreateMessageRequestParams{

[task](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-task)?:[TaskMetadata](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskmetadata);

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[messages](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-messages):[SamplingMessage](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage)[];

[modelPreferences](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-modelpreferences)?:[ModelPreferences](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences);

[systemPrompt](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-systemprompt)?:string;

[includeContext](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-includecontext)?:“none”|“thisServer”|“allServers”;

[temperature](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-temperature)?:number;

[maxTokens](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-maxtokens):number;

[stopSequences](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-stopsequences)?:string[];

[metadata](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-metadata)?:object;

[tools](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-tools)?:[Tool](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool)[];

[toolChoice](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-toolchoice)?:[ToolChoice](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolchoice);

}

Parameters for a `sampling/createMessage` request.

task?: TaskMetadata[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-task)

If specified, the caller is requesting task-augmented execution for this request. The request will return a CreateTaskResult immediately, and the actual result can be retrieved later via tasks/result.

Task augmentation is subject to capability negotiation - receivers MUST declare support for task augmentation of specific request types in their capabilities.

Inherited from TaskAugmentedRequestParams.task

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from TaskAugmentedRequestParams._meta

messages: SamplingMessage[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-messages)

modelPreferences?: ModelPreferences[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-modelpreferences)

The server’s preferences for which model to select. The client MAY ignore these preferences.

systemPrompt?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-systemprompt)

An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.

includeContext?: “none” | “thisServer” | “allServers”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-includecontext)

A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.

Default is “none”. Values “thisServer” and “allServers” are soft-deprecated. Servers SHOULD only use these values if the client declares ClientCapabilities.sampling.context. These values may be removed in future spec releases.

temperature?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-temperature)

maxTokens: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-maxtokens)

The requested maximum number of tokens to sample (to prevent runaway completions).

The client MAY choose to sample fewer tokens than the requested maximum.

stopSequences?: string[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-stopsequences)

metadata?: object[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-metadata)

Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.

tools?: Tool[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-tools)

Tools that the model may use during generation. The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.

toolChoice?: ToolChoice[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessagerequestparams-toolchoice)

Controls how the model uses tools. The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared. Default is `{ mode: “auto” }`.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult)

`CreateMessageResult`

interface CreateMessageResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult-_meta)?:{[key:string]:unknown};

[model](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult-model):string;

[stopReason](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult-stopreason)?:string;

[role](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult-role):[Role](https://modelcontextprotocol.io/specification/2025-11-25/schema#role);

[content](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult-content):[SamplingMessageContentBlock](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessagecontentblock)|[SamplingMessageContentBlock](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessagecontentblock)[];

[key:string]:unknown;

}

The client’s response to a sampling/createMessage request from the server. The client should inform the user before returning the sampled message, to allow them to inspect the response (human in the loop) and decide whether to allow the server to see it.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

model: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult-model)

The name of the model that generated the message.

stopReason?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult-stopreason)

The reason why sampling stopped, if known.

Standard values:

*   “endTurn”: Natural end of the assistant’s turn
*   “stopSequence”: A stop sequence was encountered
*   “maxTokens”: Maximum token limit was reached
*   “toolUse”: The model wants to use one or more tools

This field is an open string to allow for provider-specific stop reasons.

role: Role[](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult-role)

Inherited from [SamplingMessage](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage).[role](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage-role)

content: SamplingMessageContentBlock | SamplingMessageContentBlock[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#createmessageresult-content)

Inherited from [SamplingMessage](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage).[content](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage-content)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelhint)

`ModelHint`

interface ModelHint{

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelhint-name)?:string;

}

Hints to use for model selection.

Keys not declared here are currently left unspecified by the spec and are up to the client to interpret.

name?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelhint-name)

A hint for a model name.

The client SHOULD treat this as a substring of a model name; for example:

*   `claude-3-5-sonnet` should match `claude-3-5-sonnet-20241022`
*   `sonnet` should match `claude-3-5-sonnet-20241022`, `claude-3-sonnet-20240229`, etc.
*   `claude` should match any Claude model

The client MAY also map the string to a different provider’s model name or a different model family, as long as it fills a similar niche; for example:

*   `gemini-1.5-flash` could match `claude-3-haiku-20240307`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences)

`ModelPreferences`

interface ModelPreferences{

[hints](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences-hints)?:[ModelHint](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelhint)[];

[costPriority](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences-costpriority)?:number;

[speedPriority](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences-speedpriority)?:number;

[intelligencePriority](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences-intelligencepriority)?:number;

}

The server’s preferences for model selection, requested of the client during sampling.

Because LLMs can vary along multiple dimensions, choosing the “best” model is rarely straightforward. Different models excel in different areas—some are faster but less capable, others are more capable but more expensive, and so on. This interface allows servers to express their priorities across multiple dimensions to help clients make an appropriate selection for their use case.

These preferences are always advisory. The client MAY ignore them. It is also up to the client to decide how to interpret these preferences and how to balance them against other considerations.

hints?: ModelHint[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences-hints)

Optional hints to use for model selection.

If multiple hints are specified, the client MUST evaluate them in order (such that the first match is taken).

The client SHOULD prioritize these hints over the numeric priorities, but MAY still use the priorities to select from ambiguous matches.

costPriority?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences-costpriority)

How much to prioritize cost when selecting a model. A value of 0 means cost is not important, while a value of 1 means cost is the most important factor.

speedPriority?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences-speedpriority)

How much to prioritize sampling speed (latency) when selecting a model. A value of 0 means speed is not important, while a value of 1 means speed is the most important factor.

intelligencePriority?: number[](https://modelcontextprotocol.io/specification/2025-11-25/schema#modelpreferences-intelligencepriority)

How much to prioritize intelligence and capabilities when selecting a model. A value of 0 means intelligence is not important, while a value of 1 means intelligence is the most important factor.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage)

`SamplingMessage`

interface SamplingMessage{

[role](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage-role):[Role](https://modelcontextprotocol.io/specification/2025-11-25/schema#role);

[content](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage-content):[SamplingMessageContentBlock](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessagecontentblock)|[SamplingMessageContentBlock](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessagecontentblock)[];

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage-_meta)?:{[key:string]:unknown};

}

Describes a message issued to or received from an LLM API.

role: Role[](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage-role)

content: SamplingMessageContentBlock | SamplingMessageContentBlock[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage-content)

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessage-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#samplingmessagecontentblock)

`SamplingMessageContentBlock`

SamplingMessageContentBlock:

|[TextContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#textcontent)

|[ImageContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#imagecontent)

|[AudioContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#audiocontent)

|[ToolUseContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent)

|[ToolResultContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolchoice)

`ToolChoice`

interface ToolChoice{

[mode](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolchoice-mode)?:“none”|“required”|“auto”;

}

Controls tool selection behavior for sampling requests.

mode?: “none” | “required” | “auto”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolchoice-mode)

Controls the tool use ability of the model:

*   “auto”: Model decides whether to use tools (default)
*   “required”: Model MUST use at least one tool before completing
*   “none”: Model MUST NOT use any tools

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent)

`ToolResultContent`

interface ToolResultContent{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-type):“tool_result”;

[toolUseId](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-tooluseid):string;

[content](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-content):[ContentBlock](https://modelcontextprotocol.io/specification/2025-11-25/schema#contentblock)[];

[structuredContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-structuredcontent)?:{[key:string]:unknown};

[isError](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-iserror)?:boolean;

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-_meta)?:{[key:string]:unknown};

}

The result of a tool use, provided by the user back to the assistant.

type: “tool_result”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-type)

toolUseId: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-tooluseid)

The ID of the tool use this result corresponds to.

This MUST match the ID from a previous ToolUseContent.

content: ContentBlock[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-content)

The unstructured result content of the tool use.

This has the same format as CallToolResult.content and can include text, images, audio, resource links, and embedded resources.

structuredContent?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-structuredcontent)

An optional structured result object.

If the tool defined an outputSchema, this SHOULD conform to that schema.

isError?: boolean[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-iserror)

Whether the tool use resulted in an error.

If true, the content typically describes the error that occurred. Default: false

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolresultcontent-_meta)

Optional metadata about the tool result. Clients SHOULD preserve this field when including tool results in subsequent sampling requests to enable caching optimizations.

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent)

`ToolUseContent`

interface ToolUseContent{

[type](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent-type):“tool_use”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent-id):string;

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent-name):string;

[input](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent-input):{[key:string]:unknown};

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent-_meta)?:{[key:string]:unknown};

}

A request from the assistant to call a tool.

type: “tool_use”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent-type)

id: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent-id)

A unique identifier for this tool use.

This ID is used to match tool results to their corresponding tool uses.

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent-name)

The name of the tool to call.

input: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent-input)

The arguments to pass to the tool, conforming to the tool’s input schema.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolusecontent-_meta)

Optional metadata about the tool use. Clients SHOULD preserve this field when including tool uses in subsequent sampling requests to enable caching optimizations.

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#tools/call)

`tools/call`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequest)

`CallToolRequest`

interface CallToolRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequest-method):“tools/call”;

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequest-params):[CallToolRequestParams](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams);

}

Used by the client to invoke a tool provided by the server.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequest-jsonrpc)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-jsonrpc)

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequest-id)

Inherited from [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-id)

method: “tools/call”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequest-method)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-method)

params: CallToolRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequest-params)

Overrides [JSONRPCRequest](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest).[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#jsonrpcrequest-params)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams)

`CallToolRequestParams`

interface CallToolRequestParams{

[task](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams-task)?:[TaskMetadata](https://modelcontextprotocol.io/specification/2025-11-25/schema#taskmetadata);

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams-_meta)?:{progressToken?:[ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken);[key:string]:unknown};

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams-name):string;

[arguments](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams-arguments)?:{[key:string]:unknown};

}

Parameters for a `tools/call` request.

task?: TaskMetadata[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams-task)

If specified, the caller is requesting task-augmented execution for this request. The request will return a CreateTaskResult immediately, and the actual result can be retrieved later via tasks/result.

Task augmentation is subject to capability negotiation - receivers MUST declare support for task augmentation of specific request types in their capabilities.

Inherited from TaskAugmentedRequestParams.task

_meta?: { progressToken?: ProgressToken; [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Type Declaration

*   [key: string]:unknown 
*   `Optional`progressToken?: [ProgressToken](https://modelcontextprotocol.io/specification/2025-11-25/schema#progresstoken) If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications. 

Inherited from TaskAugmentedRequestParams._meta

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams-name)

The name of the tool.

arguments?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolrequestparams-arguments)

Arguments to use for the tool call.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult)

`CallToolResult`

interface CallToolResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult-_meta)?:{[key:string]:unknown};

[content](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult-content):[ContentBlock](https://modelcontextprotocol.io/specification/2025-11-25/schema#contentblock)[];

[structuredContent](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult-structuredcontent)?:{[key:string]:unknown};

[isError](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult-iserror)?:boolean;

[key:string]:unknown;

}

The server’s response to a tool call.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from [Result](https://modelcontextprotocol.io/specification/2025-11-25/schema#result).[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#result-_meta)

content: ContentBlock[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult-content)

A list of content objects that represent the unstructured result of the tool call.

structuredContent?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult-structuredcontent)

An optional JSON object that represents the structured result of the tool call.

isError?: boolean[](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult-iserror)

Whether the tool call ended in an error.

If not set, this is assumed to be false (the call was successful).

Any errors that originate from the tool SHOULD be reported inside the result object, with `isError` set to true, _not_ as an MCP protocol-level error response. Otherwise, the LLM would not be able to see that an error occurred and self-correct.

However, any errors in _finding_ the tool, an error indicating that the server does not support tool calls, or any other exceptional conditions, should be reported as an MCP error response.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#tools/list)

`tools/list`

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsrequest)

`ListToolsRequest`

interface ListToolsRequest{

[jsonrpc](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsrequest-jsonrpc):“2.0”;

[id](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsrequest-id):[RequestId](https://modelcontextprotocol.io/specification/2025-11-25/schema#requestid);

[params](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsrequest-params)?:PaginatedRequestParams;

[method](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsrequest-method):“tools/list”;

}

Sent from the client to request a list of tools the server has.

jsonrpc: “2.0”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsrequest-jsonrpc)

Inherited from PaginatedRequest.jsonrpc

id: RequestId[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsrequest-id)

Inherited from PaginatedRequest.id

params?: PaginatedRequestParams[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsrequest-params)

Inherited from PaginatedRequest.params

method: “tools/list”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsrequest-method)

Overrides PaginatedRequest.method

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsresult)

`ListToolsResult`

interface ListToolsResult{

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsresult-_meta)?:{[key:string]:unknown};

[nextCursor](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsresult-nextcursor)?:string;

[tools](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsresult-tools):[Tool](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool)[];

[key:string]:unknown;

}

The server’s response to a tools/list request from the client.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsresult-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

Inherited from PaginatedResult._meta

nextCursor?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsresult-nextcursor)

An opaque token representing the pagination position after the last returned result. If present, there may be more results available.

Inherited from PaginatedResult.nextCursor

tools: Tool[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#listtoolsresult-tools)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool)

`Tool`

interface Tool{

[icons](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-icons)?:[Icon](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon)[];

[name](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-name):string;

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-title)?:string;

[description](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-description)?:string;

[inputSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-inputschema):{

$schema?:string;

type:“object”;

properties?:{[key:string]:object};

required?:string[];

};

[execution](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-execution)?:[ToolExecution](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolexecution);

[outputSchema](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-outputschema)?:{

$schema?:string;

type:“object”;

properties?:{[key:string]:object};

required?:string[];

};

[annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-annotations)?:[ToolAnnotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations);

[_meta](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-_meta)?:{[key:string]:unknown};

}

Definition for a tool the client can call.

icons?: Icon[][](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-icons)

Optional set of sized icons that the client can display in a user interface.

Clients that support rendering icons MUST support at least the following MIME types:

*   `image/png` - PNG images (safe, universal compatibility)
*   `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)

Clients that support rendering icons SHOULD also support:

*   `image/svg+xml` - SVG images (scalable but requires security precautions)
*   `image/webp` - WebP images (modern, efficient format)

Inherited from Icons.icons

name: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-name)

Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn’t present).

Inherited from BaseMetadata.name

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-title)

Intended for UI and end-user contexts — optimized to be human-readable and easily understood, even by those unfamiliar with domain-specific terminology.

If not provided, the name should be used for display (except for Tool, where `annotations.title` should be given precedence over using `name`, if present).

Inherited from BaseMetadata.title

description?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-description)

A human-readable description of the tool.

This can be used by clients to improve the LLM’s understanding of available tools. It can be thought of like a “hint” to the model.

inputSchema: { $schema?: string; type: “object”; properties?: { [key: string]: object }; required?: string[]; }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-inputschema)

A JSON Schema object defining the expected parameters for the tool.

execution?: ToolExecution[](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-execution)

Execution-related properties for this tool.

outputSchema?: { $schema?: string; type: “object”; properties?: { [key: string]: object }; required?: string[]; }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-outputschema)

An optional JSON Schema object defining the structure of the tool’s output returned in the structuredContent field of a CallToolResult.

Defaults to JSON Schema 2020-12 when no explicit $schema is provided. Currently restricted to type: “object” at the root level.

annotations?: ToolAnnotations[](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-annotations)

Optional additional tool information.

Display name precedence order is: title, annotations.title, then name.

_meta?: { [key: string]: unknown }[](https://modelcontextprotocol.io/specification/2025-11-25/schema#tool-_meta)

See [General fields: `_meta`](https://modelcontextprotocol.io/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations)

`ToolAnnotations`

interface ToolAnnotations{

[title](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations-title)?:string;

[readOnlyHint](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations-readonlyhint)?:boolean;

[destructiveHint](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations-destructivehint)?:boolean;

[idempotentHint](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations-idempotenthint)?:boolean;

[openWorldHint](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations-openworldhint)?:boolean;

}

Additional properties describing a Tool to clients.

NOTE: all properties in ToolAnnotations are **hints**. They are not guaranteed to provide a faithful description of tool behavior (including descriptive properties like `title`).

Clients should never make tool use decisions based on ToolAnnotations received from untrusted servers.

title?: string[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations-title)

A human-readable title for the tool.

readOnlyHint?: boolean[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations-readonlyhint)

If true, the tool does not modify its environment.

Default: false

destructiveHint?: boolean[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations-destructivehint)

If true, the tool may perform destructive updates to its environment. If false, the tool performs only additive updates.

(This property is meaningful only when `readOnlyHint == false`)

Default: true

idempotentHint?: boolean[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations-idempotenthint)

If true, calling the tool repeatedly with the same arguments will have no additional effect on its environment.

(This property is meaningful only when `readOnlyHint == false`)

Default: false

openWorldHint?: boolean[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations-openworldhint)

If true, this tool may interact with an “open world” of external entities. If false, the tool’s domain of interaction is closed. For example, the world of a web search tool is open, whereas that of a memory tool is not.

Default: true

### [​](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolexecution)

`ToolExecution`

interface ToolExecution{

[taskSupport](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolexecution-tasksupport)?:“forbidden”|“optional”|“required”;

}

Execution-related properties for a tool.

taskSupport?: “forbidden” | “optional” | “required”[](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolexecution-tasksupport)

Indicates whether this tool supports task-augmented execution. This allows clients to handle long-running operations through polling the task system.

*   “forbidden”: Tool does not support task-augmented execution (default when absent)
*   “optional”: Tool may support task-augmented execution
*   “required”: Tool requires task-augmented execution

Default: “forbidden”

Was this page helpful?

Yes No

[Pagination](https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/pagination)

⌘I

[github](https://github.com/modelcontextprotocol)
