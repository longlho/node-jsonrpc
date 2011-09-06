var server = require('http');
var assert = require('assert');
var jrpcs = require('./jrpc');
var client = require('http');
var callbackFired = false;

server.createServer(function(req, res){
    jrpcs.handler(req, res);
}).listen(3000);

client.cat('http://localhost:3000/?json={}').addCallback(function(data) {
    callbackFired = true;
    assert.equal('{}', data);
    server.close();
});

process.addListen('exit', function(){
    assert.ok(callbackFired);
});