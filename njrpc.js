/**
 * Some notes: 
 * - preHandle is a request interceptor that can inject extra "hidden" params into
 * request object (for authentication and things of that purpose). It can also reject the request
 * by throwing exception, which will be returned to sender.
 */
var URL = require('url');
var JRPCServer = (function() {
    var _errors = {
        'Parse Error': -32700,
        'Invalid Request': -32600,
        'Method Not Found': -32601,
        'Invalid Params': -32602,
        'Internal Error': -32603
    }
    ,   _modules = {}
    ,   _preHandle = null
    ,   _customPaths = {
            '/version': function(req, res) { return JRPCServer.output(res, '1.0.3'); }
        }
    ,   _generateError = function(reqId, errorName, errorMessage, errorData) {
            if (!(errorName in _errors)) errorName = 'Internal Error';
            return {
                jsonrpc: '2.0',
                error: {
                    code: _errors[errorName],
                    message: errorName + '. ' + errorMessage,
                    data: errorData
                },
                id: reqId
            };
        }
    ,   _dispatchInternal = function(res, jsonRequest) {
            if (Array.isArray(jsonRequest)) { // handles batching calls
                var results = [];
                for (var i = 0; i < jsonRequest.length; i++) 
                    _dispatchSingle(jsonRequest[i], function(result) {
                        results.push(result);
                        if (results.length === jsonRequest.length) JRPCServer.output(res, results);
                    });
                return;
            }
            return _dispatchSingle(jsonRequest, function(result) {
                JRPCServer.output(res, result);
            });
        }
    ,   _dispatchSingle = function(jReq, callbackFn) {
            if (!jReq) return callbackFn(_generateError(null, 'Invalid Request', 'No request found'));
            if (!jReq.id) return callbackFn(_generateError(null, 'Invalid Request', 'ID must be specified'));
            if (!jReq.method) return callbackFn(_generateError(jReq.id, 'Invalid Request', 'Method must be specified'));
            var reqId = jReq.id
            ,   methodArr = jReq.method.split('\.')
            ,   handler = _modules[methodArr[0]];
            
            if (!handler || !handler.hasOwnProperty(methodArr[1])) return callbackFn(_generateError(reqId, 'Method Not Found', handler + " doesn't have " + jReq.method));
            try {
                // Invoke delegation to prehandle request object
                if (_preHandle) _preHandle(jReq);
                var parameters = jReq.params;
                if (!Array.isArray(parameters)) { // handle map parameters
                    parameters = [];
                    var paramList = handler[methodArr[1]].toString().match(/\(.*?\)/)[0].match(/[\w]+/g);
                    for (var i = 0; i < paramList.length; i++) 
                        if (paramList[i] in jReq.params) 
                            parameters.push(jReq.params[paramList[i]]);
                        
                    
                }
                parameters.push(function(result) {
                    callbackFn({
                        jsonrpc: '2.0',
                        result: result,
                        id: reqId
                    });
                });
                var result = handler[methodArr[1]].apply(handler, parameters);
                if (result) 
                    return callbackFn({
                        jsonrpc: '2.0',
                        result: result,
                        id: reqId
                    });
            }
            catch (e) { return callbackFn(_generateError(reqId, 'Internal Error', e)); }
        }
    ,   _handleInvalidRequest = function(code, message, res) {
            res.writeHead(code, {
                'Content-Length': message.length,
                'Content-Type': 'text/plain'
            });
            res.end(message);
        };
        
    return {
        register: function(modules) {
            if (Array.isArray(modules)) 
                for (var i = 0; i < modules.length; i++)
                    _modules[modules[i].name] = modules[i];
            else 
                _modules[modules.name] = modules;
        },
        addCustomPath: function(url, handlerFn) { //Allow custom handlers for certain paths
            _customPaths[url] = handlerFn;
        },
        output: function(res, jsonResponse) {
            var result = typeof jsonResponse == 'string' ? jsonResponse : JSON.stringify(jsonResponse);
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Length': result.length
            });
            res.end(result);
        },
        handle: function(req, res, preHandleFn) {
            if (typeof preHandleFn == 'function') _preHandle = preHandleFn;
            //Only accept GET & POST methods
            if (req.method != 'POST' && req.method != 'GET') return _handleInvalidRequest(400, 'Method can only be GET or POST', res);
            var url;

            //Parse the URL
            try { url = URL.parse(req.url, true); }
            catch (e) { return _handleInvalidRequest(400, 'Malformed Request', res); }
            //Allow certain paths to go thru
            if (url.pathname in _customPaths) {
                try { return _customPaths[url.pathname](req, res); }
                catch (er) { return _handleInvalidRequest(400, 'Error resolving path' + url.pathname, res); }
            }
            if (req.method == 'POST') {
                //Grab POST request
                var jsonString = '';
                req.on('data', function(chunk) { jsonString += chunk; });
                req.on('end', function() {
                    if (!jsonString.length) return _handleInvalidRequest(400, 'Body should not be empty in the request', res);
                    try { return _dispatchInternal(res, JSON.parse(jsonString)); }
                    catch (err) { return JRPCServer.output(res, _generateError(null, "Parse Error", err + ". Cannot parse message body: " + jsonString)); }
                });
            }
            else { //Allow GET method with params following JSON-RPC spec
                var jsonRequest = url.query;
                if (typeof jsonRequest.params === 'string') jsonRequest.params = JSON.parse(jsonRequest.params);
                _dispatchInternal(res, jsonRequest);
            }
        }
    };
})();
module.exports = JRPCServer;
