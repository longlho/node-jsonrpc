var http = require('http'),
	jrpcServer = require('../../njrpc'),
	AuthenticatedEchoHandler = require('./AuthenticatedEchoHandler'),
	PORT=8080,
	preHandler = function (jsonReq) {
		if (jsonReq.headers) {
			if (Array.isArray(jsonReq.params)) {
				jsonReq.params.unshift(jsonReq.headers);
			} else {
				jsonReq.params.context = jsonReq.headers;
			}
		}
	}
	
	

jrpcServer.register(new AuthenticatedEchoHandler());


http.createServer(function(req, res) {
    jrpcServer.handle(req, res, preHandler);
}).listen(PORT);
console.log('Server running at port ' + PORT);
