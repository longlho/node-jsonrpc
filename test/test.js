var http = require('http'),
	assert = require('assert'),
	jrpcs = require('../njrpc'),
	Helper = require('./helper'),
	EchoHandler = require('./EchoHandler'),
	AuthenticatedEchoHandler = require('./AuthenticatedEchoHandler'),
	preHandler = function (jsonReq) {
		if (jsonReq.headers) {
			if (Array.isArray(jsonReq.params)) {
				jsonReq.params.unshift(jsonReq.headers);
			} else {
				jsonReq.params.context = jsonReq.headers;
			}
		}
	},
	banner = function (message) { console.log(message + '\n---------'); },
	server = http.createServer(function(req, res) {
       	// Register the handlers with JRPC
		jrpcs.register([new EchoHandler(), new AuthenticatedEchoHandler()]);
        jrpcs.handle(req, res, preHandler);
    });
    
    
    
// Initiate TestManager    
var TestManager = {
    done: 0,
    finish: function(message) {
        TestManager.done++;
        banner(message);
        if (TestManager.done == (TestManager.suite.length)) server.close();
    },
    suite : [],
    run : function () {
    	for (var i = 0; i < TestManager.suite.length; i++) {
        	TestManager.suite[i]();
    	}
    }
}

TestManager.suite.push(function() {
    http.request(Helper.getOptions(), function(res) {
        Helper.checkBadResponse(res);
        TestManager.finish('Test empty body POST request… passed');
    }).end();
});
    
TestManager.suite.push(function() {
    var reqId = 1,
    	options = Helper.getOptions();
    options.method = 'GET';
    options.path = "/" + Helper.sampleGetRequest("Method.doesNotExist", [], reqId);
    http.request(options, function(res) {
        Helper.checkResponseCompliant(reqId, res, function(json) {
            assert(json.error, "Should be error");
            assert(json.error.message.indexOf("Method Not Found") > -1, "Error message should be Method Not Found, but was " + JSON.stringify(json.error));
            TestManager.finish('Test method not found request… passed');
        });
    }).end();
});


TestManager.suite.push(function() {
    var reqId = 2,
    	options = Helper.getOptions();
    options.method = 'GET';
    options.path = "/" + Helper.sampleGetRequest("EchoHandler.echo", ['test'], reqId);
    http.request(options, function(res) {
        Helper.checkResponseCompliant(reqId, res, function(json) {
            assert(!json.error, "Should not be error " + JSON.stringify(json));
            assert.equal(json.result, 'test');
            TestManager.finish('Test EchoHandler.echo GET request… passed');
        });
    }).end();
});
    
TestManager.suite.push(function() {
    var reqId = 2,
        body = Helper.samplePostRequest("EchoHandler.echo", ['test'], reqId);
    http.request(Helper.getOptions(), function(res) {
        Helper.checkResponseCompliant(reqId, res, function(json) {
            assert(!json.error, "Should not be error " + JSON.stringify(json));
            assert.equal(json.result, 'test');
            TestManager.finish('Test EchoHandler.echo POST request… passed');
        });
    }).end(body);
});
    
TestManager.suite.push(function() {
    var reqId = 2,
    	options = Helper.getOptions();
    options.method = 'GET';
    options.path = "/" + Helper.sampleGetRequest("EchoHandler.echo", {
        str: 'test'
    }, reqId);
    http.request(options, function(res) {
        Helper.checkResponseCompliant(reqId, res, function(json) {
            assert(!json.error, "Should not be error " + JSON.stringify(json));
            assert.equal(json.result, 'test');
            TestManager.finish('Test EchoHandler.echo with Map param request… passed');
        });
    }).end();
});
    
TestManager.suite.push(function() {
    var reqId = 2,
    	options = Helper.getOptions();
    options.method = 'GET';
    options.path = "/" + Helper.sampleGetRequest("EchoHandler.echoArray", ['test', ' is good'], reqId);
    http.request(options, function(res) {
        Helper.checkResponseCompliant(reqId, res, function(json) {
            assert(!json.error, "Should not be error " + JSON.stringify(json));
            assert.equal(json.result, 'test is good');
            TestManager.finish('Test EchoHandler.echoArray request… passed');
        });
    }).end();
});
    
TestManager.suite.push(function() {
    var reqId = 20;
    http.request(Helper.getOptions(), function(res) {
        Helper.checkResponseCompliant(reqId, res, function(json) {
            assert(!json.error, "Should not be error " + JSON.stringify(json));
            assert.equal(json.result, 'test post is good');
            TestManager.finish('Test EchoHandler.echoArray request POST… passed');
        });
    }).end(Helper.samplePostRequest("EchoHandler.echoArray", ['test post', ' is good'], reqId));
});

TestManager.suite.push(function () {
	var reqs = [
		Helper.samplePostRequest("EchoHandler.echo", ['test'], 99, 'object'),
		Helper.samplePostRequest("EchoHandler.echo", ['test2'], 98, 'object')
		];
	http.request(Helper.getOptions(), function(res) {
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
        	TestManager.finish('Test EchoHandler.echo POST request array… passed');
        });
    }).end(JSON.stringify(reqs));
});

TestManager.suite.push(function() {
    var reqId = 21,
		req = Helper.samplePostRequest("AuthenticatedEchoHandler.echo", ['test post'], reqId, 'object');
	
	req.headers = {
		user : 'test user',
		token : 123
	}
    http.request(Helper.getOptions(), function(res) {
        Helper.checkResponseCompliant(reqId, res, function(json) {
            assert(!json.error, "Should not be error " + JSON.stringify(json));
            assert.equal(json.result, 'test post');
            TestManager.finish('Test authentication POST… passed');
        });
    }).end(JSON.stringify(req));
});

TestManager.suite.push(function() {
    var reqId = 21,
		req = Helper.samplePostRequest("AuthenticatedEchoHandler.echo", { str : 'test post' }, reqId, 'object');
	
	req.headers = {
		user : 'test user',
		token : 123
	}
    http.request(Helper.getOptions(), function(res) {
        Helper.checkResponseCompliant(reqId, res, function(json) {
            assert(!json.error, "Should not be error " + JSON.stringify(json));
            assert.equal(json.result, 'test post');
            TestManager.finish('Test authentication map POST… passed');
        });
    }).end(JSON.stringify(req));
});

TestManager.suite.push(function() {
    var reqId = 21,
		req = Helper.samplePostRequest("AuthenticatedEchoHandler.echo", ['test post'], reqId, 'object');
	
	req.headers = {
		user : 'test user',
	}
    http.request(Helper.getOptions(), function(res) {
        Helper.checkResponseCompliant(reqId, res, function(json) {
        	assert(json.error, "Should be error " + JSON.stringify(json));
        	assert(!json.result);
        	assert.equal(json.error.message, 'Internal Error. Error: This call has to be authenticated');
            TestManager.finish('Test authentication error POST… passed');
        });
    }).end(JSON.stringify(req));
});

TestManager.suite.push(function() {
    var reqId = 21,
		req = Helper.samplePostRequest("AuthenticatedEchoHandler.echo", {str : 'test post'}, reqId, 'object');
	
	req.headers = {
		user : 'test user',
	}
    http.request(Helper.getOptions(), function(res) {
        Helper.checkResponseCompliant(reqId, res, function(json) {
        	assert(json.error, "Should be error " + JSON.stringify(json));
        	assert(!json.result);
        	assert.equal(json.error.message, 'Internal Error. Error: This call has to be authenticated');
            TestManager.finish('Test authentication map error POST… passed');
        });
    }).end(JSON.stringify(req));
});



// Start server and test
server.listen(3000, 'localhost', function() {
    TestManager.run();
});
