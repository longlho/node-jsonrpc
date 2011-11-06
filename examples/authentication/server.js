var http = require('http');
var jrpcServer = require('../../njrpc');
var AuthenticatedEchoHandler = require('./AuthenticatedEchoHandler');

var PORT=8080;
jrpcServer.registerModule(new AuthenticatedEchoHandler());


http.createServer(function(req, res) {
    jrpcServer.handle(req, res);
}).listen(PORT);
console.log('Server running at port ' + PORT);
