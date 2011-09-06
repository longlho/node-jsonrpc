var http = require('http');
var jrpcServer = require('./jrpc.js');
PORT = 8080;
http.createServer(function(req, res) {
    jrpcServer.handle(req, res);
}).listen(PORT);
console.log('Server running at port ' + PORT);