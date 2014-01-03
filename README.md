# Overview
[![Build Status](https://secure.travis-ci.org/longlho/node-jsonrpc.png)](https://secure.travis-ci.org/longlho/node-jsonrpc)
[![Coverage Status](https://coveralls.io/repos/longlho/node-jsonrpc/badge.png)](https://coveralls.io/r/longlho/node-jsonrpc)

This is a JSON-RPC protocol implementation in NodeJS that follows JSON-RPC 2.0 specs. The good and also bad thing about this library is that it enforces method handler modules to have a certain convention/design pattern. However, it allows the server to automatically extract documentation from the handler (Introspection). This library is still under development.

## Features
- Handles GET/POST requests
- Better error feedback
- Allows method namespacing (Module.method)
- Allows exposure of all methods inside a module
- Authentication can be achieved by giving a preHandle function
- Introspection (currently planning)

## Installation
The usual `npm install njrpc` or if you prefer, you can grab the source/fork it and make changes yourself.

## Usage
Handlers that can be registered with njrpc should have a name attribute in the instance. A sample handler can be found in handler.js.

The best design pattern to use with this server is the Module design pattern.

### njrpc.errors
List of errors that JSON-RPC server supports.

### njrpc.modules
Map of all the RPC module, in the form of `modules[className].methodName`

### njrpc.register(modules)
Registers an array of modules/a single module, which should have `name` as the namespace of the module.

### njrpc.interceptor
Interceptor capable of pre-processing json request before it get
dispatched to Handler modules.
This function takes in 2 parameters:

- `jsonRequest`: JSON request object
- `next`: Function signaling continuation of the process. Passing an
  `Error` to this function will force server to return an error response
instead of moving on.

### njrpc.paths
Map of custom URL to handler function. Handler function takes in 2
arguments: 

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

jrpcServer.register(new EchoHandler());
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
,	preHandler = function (jsonReq, next) {
		if (jsonReq.headers) {
			Array.isArray(jsonReq.params)
			? jsonReq.params.unshift(jsonReq.headers)
			: jsonReq.params.context = jsonReq.headers;
			return next();
		}
		return next(new Error('User has to be authenticated'));
	}
,	jrpcServer = require('njrpc')
,	http = require('http');

jrpcServer.register(new AuthenticatedEchoHandler());
jrpcServer.interceptor = preHandler;
http.createServer(jrpcServer.handle).listen(8080);
```
