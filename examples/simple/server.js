var http = require('http');
var jrpcServer = require('../../njrpc');
var EchoHandler = require('./handler');

var PORT=8080;
jrpcServer.register(new EchoHandler());

http.createServer(function(req, res) {
    jrpcServer.handle(req, res);
}).listen(PORT);
console.log('Server running at port ' + PORT);
