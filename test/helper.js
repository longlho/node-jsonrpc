var assert = require('assert'),
    events = require('events'),
    Helper = (function() {
        return {
            checkBadResponse: function(res) {
                assert.notEqual(200, res.statusCode, "Response should not be 200 " + res.statusCode);
                assert.equal('text/plain', res.headers['content-type'], "Content Type should be text/plain");
                assert.ok(res.headers['content-length'] > 0, 'Content Length should be set');
            },
            getOptions: function() {
                return {
                    hostname: 'localhost',
                    port: 4000,
                    method: 'POST'
                };
            },
            samplePostRequest: function(methodName, parameters, uid, mode) {
                var req = {
                    jsonrpc: '2.0',
                    method: methodName,
                    params: parameters,
                    id: uid
                };
                return mode == 'object' ? req : JSON.stringify(req);
            },
            sampleGetRequest: function(methodName, parameters, uid) {
                return "?jsonrpc=2.0&method=" + methodName + "&params=" + encodeURIComponent(JSON.stringify(parameters)) + "&id=" + uid;
            },
            parseResponse : function (res) {
                var promise = new(events.EventEmitter),
                    resString = "";
                res.on('data', function(data) { resString += data; });
                res.on('end', function () {
                    promise.emit('success', JSON.parse(resString));
                });
                return promise;
            }
        };
    })();
module.exports = Helper;