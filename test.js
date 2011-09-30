var http = require('http');
var assert = require('assert');
var jrpcs = require('./jrpc');
var callbackFired = false;
var options = (function() {
    return {
	    host: 'localhost',
	    port: 3000,
	    method: 'POST'
	}
})();
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
    checkResponseCompliant = function(id, res, callbackFn) {
        var resString = "";
        res.on('data', function(data) {
            resString += data;
        });
        res.on('end', function() {
            var json = JSON.parse(resString);
            assert.equal(id, json.id, 'ID does not match, expect ' + id + ' = ' + json.id);
            assert.ok(json.hasOwnProperty('result') || json.hasOwnProperty('error'), 'Either result or error must be set');
	    callbackFn(json);
        });
    },
    server = http.createServer(function(req, res) {
        jrpcs.handle(req, res);
    }),
    samplePostRequest = function(methodName, parameters, uid) {
	return {
		jsonrpc : '2.0',
		method : methodName,
		params : parameters,
		id : uid
		}
	},
     sampleGetRequest = function(methodName, parameters, uid) {
	return "?jsonrpc=2.0&method=" + methodName + "&params=" + encodeURIComponent(JSON.stringify(parameters)) + "&id=" + uid;
     };
    
    
var tests = {
	done : 0,
	finish : function (num) {
	    tests.done += num;
	    var allDone = (1 << (Object.keys(tests).length - 2)) - 1;
	    if (tests.done == allDone) {
		server.close();
	    }
	},
	testEmptyBody : function() {
	    http.request(options, function(res) {
	        console.log('Test empty body POST request');
	        callbackFired = true;
	        checkBadResponse(res);
		tests.finish(1);
	    }).end();
	},

	testMethodNotFound : function() {
	    var reqId = 1;
	    options.method = 'GET';
	    options.path = "/" + sampleGetRequest("Method.doesNotExist", [], reqId); 
	    http.request(options, function(res) {
		console.log('Test method not found request');
		checkResponseCompliant(reqId, res, function(json){
		    assert.ok(json.hasOwnProperty('error'), "Should be error");
		    assert.ok(json.error.message.indexOf("Method Not Found") > -1, "Error message should be Method Not Found, but was " + JSON.stringify(json.error));	
		    tests.finish(2);
		});
            }).end();
	}
}

server.listen(3000, 'localhost', function() {
	for (var k in tests) {
		if (k !== 'done' && k !== 'finish')
		    tests[k]();
	}
   });

