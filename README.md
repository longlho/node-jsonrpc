# Overview
This is a JSON-RPC protocol implementation in NodeJS that follows JSON-RPC 2.0 specs. The good and also bad thing about this library is that it enforces method handler modules to have a certain convention/design pattern. However, it allows the server to automatically extract documentation from the handler (Introspection). This library is still under development.

## Features
- Handle GET/POST request
- Better error feedbacks
- Allow method namespacing (Module.method)
- Allow exposure of all methods inside a module
- Authentication can be achieved with giving a preHandle function
- Introspection (in progress)


## Usage
Handler that can be registered with njrpc should have name attribute in the instance. A sample handler can be found in handler.js

The best design pattern to use with this server is the Module design pattern.

### njrpc.register(modules)
Registers an array of modules/a single module, which should have `name` as the namespace of the module.

### njrpc.addCustomPath(url, handlerFn)
Add `handlerFn` to custom path, for example '/version' can return version number as plain text instead of json request.
`handlerFn` will have 2 arguments:

- `req`: Request object
- `res`: Response object to write to

### njrpc.output(res, [jsonResponse])
Actually write the json response out to the pipe. This can also be overridden to write something else.

### njrpc.handle(req, res, [preHandleFn])
Handles request & response, JSON-RPC style. `preHandleFn` is used to manipulate json request before it got pushed down to Handler level. `preHandleFn` takes a single json request object as the argument (after parsing and whitelisting)

## Examples

### Simple EchoHandler that echo whatever it receives

	var EchoHandler = function () {
			return {
				name : 'EchoHandler',
				echo : function (str) {
					return str;
				}
			};
		},
		jrpcServer = require('./njrpc'),
		http = require('http');
	
	jrpcServer.registerModule(new EchoHandler());
	http.createServer(function(req, res) {
		jrpcServer.handle(req, res);	
	}).listen(8080);
	
### Authenticated Echo Handler that still echoes, but needs user & token

	var AuthenticatedEchoHandler = function () {
			return {
				name : 'AuthenticatedEchoHandler',
				echo : function(context, str) {
					if (!context.user || !context.token) {
						throw new Error("This call is unauthenticated");
					}
					return str;
				}
			};
		},
		preHandler = function (jsonReq) {
			if (jsonReq.headers) {
				if (Array.isArray(jsonReq.params)) {
					jsonReq.params.unshift(jsonReq.headers);
				} else {
					jsonReq.params.context = jsonReq.headers;
				}
			}
		},
		jrpcServer = require('./njrpc'),
		http = require('http');
	
	jrpcServer.registerModule(new AuthenticatedEchoHandler());
	http.createServer(function(req, res) {
		jrpcServer.handle(req, res, preHandler);	
	}).listen(8080);

