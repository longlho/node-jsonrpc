var http = require('http');
var assert = require('assert');
var jrpcs = require('./jrpc');
var callbackFired = false;
var options = {
    host: 'localhost',
    port: 3000,
    method: 'POST'
};
var checkOKResponse = function(res) {
        assert.equal(200, res.statusCode, "Response should be 200");
        assert.equal('application/json', res.headers['content-type'], "Content Type should be application/json.");
        assert.ok(res.headers['content-length'] > 0, 'Content Length should be set');
    },
    checkBadResponse = function(res) {
        assert.notEqual(200, res.statusCode, "Response should not be 200");
        assert.equal('text/plain', res.headers['content-type'], "Content Type should be text/plain");
        assert.ok(res.headers['content-length'] > 0, 'Content Length should be set');
    },
    checkResponseCompliant = function(req, res) {
        var resString = "";
        res.on('data', function(data) {
            resString += data;
        });
        res.on('end', function() {
            var json = JSON.parse(resString);
            assert.equal(req.id, json.id, 'ID does not match');
            assert.ok(json.hasOwnProperty('result') || json.hasOwnProperty('error'), 'Either result or error must be set');
        });
    },
    server = http.createServer(function(req, res) {
        jrpcs.handle(req, res);
    });
    
    
server.listen(3000, 'localhost', function() {
    var req = http.request(options, function(res) {
        console.log('Test empty body POST request');
        callbackFired = true;
        checkBadResponse(res);
        server.close();
    });
    req.end();
});
process.on('exit', function() {
    assert.ok(callbackFired);
});