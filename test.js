var http = require('http');
var assert = require('assert');
var jrpcs = require('./jrpc');
var echoHandler = require('./handler');
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
        res.on('data', function(data) { resString += data; });
        res.on('end', function() {
            var json = JSON.parse(resString);
            assert.equal(id, json.id, 'ID does not match, expect ' + id + ' = ' + json.id);
            assert.ok(json.hasOwnProperty('result') || json.hasOwnProperty('error'), 'Either result or error must be set');
	    	callbackFn(json);
        });
    },
    server = http.createServer(function(req, res) {
		jrpcs.registerModule(echoHandler.init());
        jrpcs.handle(req, res);
    }),
    samplePostRequest = function(methodName, parameters, uid) {
		return JSON.stringify({
			jsonrpc : '2.0',
			method : methodName,
			params : parameters,
			id : uid
		});
	},
	sampleGetRequest = function(methodName, parameters, uid) {
		return "?jsonrpc=2.0&method=" + methodName + "&params=" + encodeURIComponent(JSON.stringify(parameters)) + "&id=" + uid;
	};
    
    
var tests = {
	done : 0,
	finish : function () {
	    tests.done++;
	    if (tests.done == (Object.keys(tests).length - 2))
			server.close();
	},
	testEmptyBody : function() {
	    http.request(options, function(res) {
	        console.log('Test empty body POST request');
	        callbackFired = true;
	        checkBadResponse(res);
			tests.finish();
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
			    tests.finish();
			});
		}).end();
	},
	
	testEchoString : function() {
		var reqId = 2;
	   	options.method = 'GET';
	   	options.path = "/" + sampleGetRequest("EchoHandler.echo", ['test'], reqId); 
	   	http.request(options, function(res) {
			console.log('Test EchoHandler.echo request');
			checkResponseCompliant(reqId, res, function(json) {
		    	assert.ok(!json.hasOwnProperty('error'), "Should not be error " + JSON.stringify(json));
		    	assert.equal(json.result, 'test');	
		    	tests.finish();
			});
		}).end();
	},

	testEchoStringPost : function() {
	   	var reqId = 2,
	       	body = samplePostRequest("EchoHandler.echo", ['test'], reqId); 
	   	http.request(options, function(res) {
			console.log('Test EchoHandler.echo POST request');
			checkResponseCompliant(reqId, res, function(json) {
			    assert.ok(!json.hasOwnProperty('error'), "Should not be error " + JSON.stringify(json));
			    assert.equal(json.result, 'test');	
			    tests.finish();
			});
		}).end(body);
	},
	testEchoStringMap : function() {
		var reqId = 2;
	   	options.method = 'GET';
	   	options.path = "/" + sampleGetRequest("EchoHandler.echo", {str : 'test'}, reqId); 
	   	http.request(options, function(res) {
			console.log('Test EchoHandler.echo with Map param request');
			checkResponseCompliant(reqId, res, function(json) {
			    assert.ok(!json.hasOwnProperty('error'), "Should not be error " + JSON.stringify(json));
			    assert.equal(json.result, 'test');	
			    tests.finish();
			});
		}).end();
	},


	testEchoStringArray : function() {
		var reqId = 2;
	   	options.path = "/" + sampleGetRequest("EchoHandler.echoArray", ['test', ' is good'], reqId); 
	   	http.request(options, function(res) {
			console.log('Test EchoHandler.echoArray request');
			checkResponseCompliant(reqId, res, function(json) {
			    assert.ok(!json.hasOwnProperty('error'), "Should not be error " + JSON.stringify(json));
			    assert.equal(json.result, 'test is good');	
			    tests.finish();
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

