var http = require('http');
var jrpcServer = require('./jrpc.js');


http.createServer(function(req, res) {
    jrpcServer.handle(req, res);
}).listen(process.env.C9_PORT, '0.0.0.0');
console.log('Server running at port ' + PORT);