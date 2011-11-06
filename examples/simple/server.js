var http = require('http'),
	jrpcServer = require('../../njrpc'),
	EchoHandler = require('./EchoHandler'),
	PORT=8080;
	
jrpcServer.register(new EchoHandler());

http.createServer(function(req, res) {
    jrpcServer.handle(req, res);
}).listen(PORT);
console.log('Server running at port ' + PORT);
