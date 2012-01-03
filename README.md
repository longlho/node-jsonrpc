[![Build Status](http://travis-ci.org/LafColDevs/metadb-core.png)](http://travis-ci.org/LafColDevs/metadb-core)

# Overview
This is a JSON-RPC protocol implementation in NodeJS that follows JSON-RPC 2.0 specs. The good and also bad thing about this library is that it enforces method handler modules to have a certain convention/design pattern. However, it allows the server to automatically extract documentation from the handler (Introspection). This library is still under development.

## Features
- Handles GET/POST requests
- Better error feedback
- Allows method namespacing (Module.method)
- Allows exposure of all methods inside a module
- Authentication can be achieved by giving a preHandle function
- Introspection (in progress)

## Installation
The usual `npm install njrpc` or if you prefer, you can grab the source/fork it and make changes yourself.

## Usage
Handlers that can be registered with njrpc should have a name attribute in the instance. A sample handler can be found in handler.js.

The best design pattern to use with this server is the Module design pattern.

### njrpc.register(modules)
Registers an array of modules/a single module, which should have `name` as the namespace of the module.

### njrpc.addCustomPath(url, handlerFn)
Add `handlerFn` to a custom path, for example '/version' can return the version number as plain text instead of a JSON request.
`handlerFn` will have 2 arguments:             

- `req`: Request object
- `res`: Response object to write to

### njrpc.output(res, [jsonResponse])
Actually write the JSON response out to the pipe. This can also be overridden to write something else.

### njrpc.handle(req, res, [preHandleFn])
Handles a request & response, JSON-RPC style. `preHandleFn` is used to manipulate the JSON request before it gets pushed down to the Handler level. `preHandleFn` takes a single JSON request object as the argument (after parsing and whitelisting)

## Examples

### Simple EchoHandler that echoes whatever it receives

```javascript
var EchoHandler = function () {
		return {
			name : 'EchoHandler',
			echo : function (str) {
				return str;
			}
		};
	}
,	jrpcServer = require('njrpc')
,	http = require('http');

jrpcServer.registerModule(new EchoHandler());
http.createServer(jrpcServer.handle).listen(8080);
```
### Authenticated Echo Handler that still echoes, but needs a user & token

```javascript
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
	}
,	preHandler = function (jsonReq) {
		if (jsonReq.headers) {
			Array.isArray(jsonReq.params)
			? jsonReq.params.unshift(jsonReq.headers)
			: jsonReq.params.context = jsonReq.headers
		}
	}
,	jrpcServer = require('njrpc')
,	http = require('http');

jrpcServer.registerModule(new AuthenticatedEchoHandler());

http.createServer(function(req, res) {
	jrpcServer.handle(req, res, preHandler);	
}).listen(8080);
```
