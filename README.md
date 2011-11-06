# Overview
This is a JSON-RPC protocol implementation in NodeJS that follows JSON-RPC 2.0 specs. The good and also bad thing about this library is that it enforces method handler modules to have a certain convention/design pattern. However, it allows the server to automatically extract documentation from the handler (Introspection). This library is still under development.

## Features
- Handle GET/POST request
- Better error feedbacks
- Allow method namespacing (Module.method)
- Allow exposure of all methods inside a module
- Introspection (in progress)
- Authentication (in progress)

## Usage
Handler that can be registered with njrpc should have name attribute in the instance. A sample handler can be found in handler.js

The best design pattern to use with this server is the Module design pattern.

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
