var http = require('http'),
	assert = require('assert'),
	jrpcs = require('../njrpc'),
	Helper = require('./helper'),
	EchoHandler = require('./EchoHandler'),
	server = http.createServer(function(req, res) {
        jrpcs.registerModule(new EchoHandler());
        jrpcs.handle(req, res);
    });
    
    
    
// Start tests    
var tests = {
    done: 0,
    finish: function() {
        tests.done++;
        if (tests.done == (Object.keys(tests).length - 2)) server.close();
    },
    testEmptyBody: function() {
        http.request(Helper.getOptions(), function(res) {
            console.log('Test empty body POST request');
            Helper.checkBadResponse(res);
            tests.finish();
        }).end();
    },
    testMethodNotFound: function() {
        var reqId = 1,
        	options = Helper.getOptions();
        options.method = 'GET';
        options.path = "/" + Helper.sampleGetRequest("Method.doesNotExist", [], reqId);
        http.request(options, function(res) {
            console.log('Test method not found request');
            Helper.checkResponseCompliant(reqId, res, function(json) {
                assert(json.error, "Should be error");
                assert(json.error.message.indexOf("Method Not Found") > -1, "Error message should be Method Not Found, but was " + JSON.stringify(json.error));
                tests.finish();
            });
        }).end();
    },
    testEchoString: function() {
        var reqId = 2,
        	options = Helper.getOptions();
        options.method = 'GET';
        options.path = "/" + Helper.sampleGetRequest("EchoHandler.echo", ['test'], reqId);
        http.request(options, function(res) {
            console.log('Test EchoHandler.echo request');
            Helper.checkResponseCompliant(reqId, res, function(json) {
                assert(!json.error, "Should not be error " + JSON.stringify(json));
                assert.equal(json.result, 'test');
                tests.finish();
            });
        }).end();
    },
    testEchoStringPost: function() {
        var reqId = 2,
            body = Helper.samplePostRequest("EchoHandler.echo", ['test'], reqId);
        http.request(Helper.getOptions(), function(res) {
            console.log('Test EchoHandler.echo POST request');
            Helper.checkResponseCompliant(reqId, res, function(json) {
                assert(!json.error, "Should not be error " + JSON.stringify(json));
                assert.equal(json.result, 'test');
                tests.finish();
            });
        }).end(body);
    },
    testEchoStringMap: function() {
        var reqId = 2,
        	options = Helper.getOptions();
        options.method = 'GET';
        options.path = "/" + Helper.sampleGetRequest("EchoHandler.echo", {
            str: 'test'
        }, reqId);
        http.request(options, function(res) {
            console.log('Test EchoHandler.echo with Map param request');
            Helper.checkResponseCompliant(reqId, res, function(json) {
                assert(!json.error, "Should not be error " + JSON.stringify(json));
                assert.equal(json.result, 'test');
                tests.finish();
            });
        }).end();
    },
    testEchoStringArray: function() {
        var reqId = 2,
        	options = Helper.getOptions();
        options.method = 'GET';
        options.path = "/" + Helper.sampleGetRequest("EchoHandler.echoArray", ['test', ' is good'], reqId);
        http.request(options, function(res) {
            console.log('Test EchoHandler.echoArray request');
            Helper.checkResponseCompliant(reqId, res, function(json) {
                assert(!json.error, "Should not be error " + JSON.stringify(json));
                assert.equal(json.result, 'test is good');
                tests.finish();
            });
        }).end();
    },
    testEchoStringArrayPost: function() {
        var reqId = 20;
        http.request(Helper.getOptions(), function(res) {
            console.log('Test EchoHandler.echoArray request POST');
            Helper.checkResponseCompliant(reqId, res, function(json) {
                assert(!json.error, "Should not be error " + JSON.stringify(json));
                assert.equal(json.result, 'test post is good');
                tests.finish();
            });
        }).end(Helper.samplePostRequest("EchoHandler.echoArray", ['test post', ' is good'], reqId));
    },
    testBoxcar : function () {
    	var reqs = [
    		Helper.samplePostRequest("EchoHandler.echo", ['test'], 99, 'object'),
    		Helper.samplePostRequest("EchoHandler.echo", ['test2'], 98, 'object')
			];
    	http.request(Helper.getOptions(), function(res) {
            console.log('Test EchoHandler.echo POST request array');
            var data = '';
            res.on('data', function (chunk) { data += chunk; });
            res.on('end', function () {
            	
            	var json = JSON.parse(data), 
            		i,
            		found99 = false,
            		found98 = false;
            		
            	assert.equal(json.length, 2);
            	
            	for (i = 0; i < json.length; i++) {
	            	if (json[i].id == 99) {
	            		found99 = true;
	            		assert.equal(json[i].result, 'test');
	            	} else if (json[i].id == 98) {
	            		found98 = true;
	            		assert.equal(json[i].result, 'test2');
	            	}
            	}
            	assert(found99 && found98);
            	tests.finish();
            });
        }).end(JSON.stringify(reqs));
    }
};

server.listen(3000, 'localhost', function() {
    for (var k in tests) {
        if (k !== 'done' && k !== 'finish') tests[k]();
    }
});