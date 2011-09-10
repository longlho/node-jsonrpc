var http = require('http');
var jrpcServer = require('./jrpc');
var echoHandler = require('./handler');

var PORT=8080;
jrpcServer.registerModule(echoHandler.init());

http.createServer(function(req, res) {
    jrpcServer.handle(req, res);
}).listen(PORT);
console.log('Server running at port ' + PORT);
