var assert = require('assert');
var Helper = (function () {
	return {
		checkOKResponse : function(res) {
        	assert.equal(200, res.statusCode, "Response should be 200");
        	assert.equal('application/json', res.headers['content-type'], "Content Type should be application/json.");
        	assert(res.headers['content-length'] > 0, 'Content Length should be set');
    	},
    	checkBadResponse : function(res) {
        	assert.notEqual(200, res.statusCode, "Response should not be 200 " + res.statusCode);
        	assert.equal('text/plain', res.headers['content-type'], "Content Type should be text/plain");
        	assert(res.headers['content-length'] > 0, 'Content Length should be set');
    	},
    	checkResponseCompliant : function(id, res, callbackFn) {
        	var resString = "";
        	res.on('data', function (data) { resString += data; });
        	res.on('end', function() {
            	var json = JSON.parse(resString);
            	assert.equal(id, json.id, 'ID does not match, expect ' + id + ' = ' + json.id);
            	assert(json.result || json.error, 'Either result or error must be set');
            	callbackFn(json);
        	});
    	},
    	getOptions : function () {
			return {
        		hostname: 'localhost',
        		port: 3000,
        		method: 'POST'
    		};
		},
		samplePostRequest : function(methodName, parameters, uid, mode) {
    		var req = {
            	jsonrpc: '2.0',
            	method: methodName,
            	params: parameters,
            	id: uid
        	};
        	return mode == 'object' ? req : JSON.stringify(req);
    	},
    	sampleGetRequest : function(methodName, parameters, uid) {
        	return "?jsonrpc=2.0&method=" + methodName + "&params=" + encodeURIComponent(JSON.stringify(parameters)) + "&id=" + uid;
    	}
	};
})();

module.exports = Helper;