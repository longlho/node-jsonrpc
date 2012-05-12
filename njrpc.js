/**
 * Some notes: 
 * - preHandle is a request interceptor that can inject extra "hidden" params into
 * request object (for authentication and things of that purpose). It can also reject the request
 * by throwing exception, which will be returned to sender.
 */
(function () {

  var root = this;

  var URL = require('url');

  var JRPCServer;
  if (typeof exports !== 'undefined') {
    JRPCServer = exports;
  } else {
    JRPCServer = root.JRPCServer = {};
  }

  var _errors = {
    'Parse Error': -32700,
    'Invalid Request': -32600,
    'Method Not Found': -32601,
    'Invalid Params': -32602,
    'Internal Error': -32603
  }
  , _modules = {}
  , _preHandle;

  var _customPaths = {
    '/version': function (req, res) { return JRPCServer.output(res, '1.0.3'); }
  };

  var _generateError = function (reqId, errorName, errorMessage, errorData) {
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
  };

  var _dispatchInternal = function (res, jsonRequest, callbackFn) {
    if (!Array.isArray(jsonRequest)) {
      return _dispatchSingle(jsonRequest, callbackFn);
    }
    // handles batching calls
    var results = [];
    for (var i = 0; i < jsonRequest.length; i++) {
      _dispatchSingle(jsonRequest[i], function (err, result) {
        results.push(err || result);
        if (results.length === jsonRequest.length) {
          return callbackFn(null, results);
        }
      });
    }
  };

  var _dispatchSingle = function (jReq, callbackFn) {
    if (!jReq) return callbackFn(_generateError(null, 'Invalid Request', 'No request found'));
    if (!jReq.id) return callbackFn(_generateError(null, 'Invalid Request', 'ID must be specified'));
    if (!jReq.method) return callbackFn(_generateError(jReq.id, 'Invalid Request', 'Method must be specified'));
    var reqId = jReq.id
    , methodArr = jReq.method.split('\.')
    , handler = _modules[methodArr[0]];

    if (!handler || !handler.hasOwnProperty(methodArr[1])) {
      return callbackFn(_generateError(reqId, 'Method Not Found', handler + " doesn't have " + jReq.method));
    }
    try {
      // Invoke delegation to prehandle request object
      if (_preHandle) _preHandle(jReq);
      var parameters = jReq.params;
      if (!Array.isArray(parameters)) { // handle map parameters
        parameters = [];
        var paramList = handler[methodArr[1]].toString().match(/\(.*?\)/)[0].match(/[\w]+/g);
        for (var i = 0; i < paramList.length; i++) {
          if (paramList[i] in jReq.params) {
            parameters.push(jReq.params[paramList[i]]);
          }
        }
      }
      parameters.push(function (result) { return _handleRespResult(reqId, result, callbackFn); });
      var result = handler[methodArr[1]].apply(handler, parameters);
      if (result) {
        return _handleRespResult(reqId, result, callbackFn);
      }
    }
    catch (e) { return callbackFn(_generateError(reqId, 'Internal Error', e)); }
  };

  var _handleRespResult = function (reqId, result, callbackFn) {
    return result instanceof Error
    ? callbackFn(_generateError(reqId, 'Internal Error', result.message))
    : callbackFn(null, {
      jsonrpc: '2.0',
      result: result,
      id: reqId
    });
  };

  var _handleInvalidRequest = function (code, message, res) {
    res.writeHead(code, {
      'Content-Length': message.length,
      'Content-Type': 'text/plain'
    });
    res.end(message);
  };

  /**
   * Register a module/list of modules to expose RPC calls.
   * @param Array/Object modules module to register
   */
  JRPCServer.register = function (modules) {
    if (Array.isArray(modules)) {
      for (var i = 0; i < modules.length; i++) {
        _modules[modules[i].name] = modules[i];
      }
    }
    else {
      _modules[modules.name] = modules;
    }
  };

  /**
   * Add handler to a URL.
   * @param String url URL to handle differently
   * @param Function handlerFn handler function, which takes in 2 args request and response
   */
  JRPCServer.addCustomPath = function (url, handlerFn) { //Allow custom handlers for certain paths
    _customPaths[url] = handlerFn;
  };

  /**
   * Write out a JSON-formatted response.
   * @param Object res NodeJS response object
   * @param Object jsonResponse JSON object to write out
   */
  JRPCServer.output = function (res, jsonResponse) {
    var result = typeof jsonResponse === 'string' ? jsonResponse : JSON.stringify(jsonResponse);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': result.length
    });
    res.end(result);
  };

  /**
   * Main function to handle a req and write out a response, which also allows interceptors
   * @param Object req NodeJS request object
   * @param Object res NodeJS response object
   * @param Function preHandleFn interceptor function that will be invoked after json is parsed from request
   * and before being processed by the handler module
   */
  JRPCServer.handle = function (req, res, preHandleFn) {
    if (typeof preHandleFn === 'function') _preHandle = preHandleFn;
    //Parse the URL
    var url = URL.parse(req.url, true);
    //Allow certain paths to go thru
    if (url.pathname in _customPaths) {
      return _customPaths[url.pathname](req, res);
    }
    switch (req.method) {
      case 'POST':
        //Grab POST request
        var jsonString = '';
        return req
        .on('data', function (chunk) { jsonString += chunk; })
        .on('end', function () {
          if (!jsonString.length) return _handleInvalidRequest(400, 'Body should not be empty in the request', res);
          try { var jsonReq = JSON.parse(jsonString); }
          catch (err) { return JRPCServer.output(res, _generateError(null, "Parse Error", err + ". Cannot parse message body: " + jsonString)); }
          return _dispatchInternal(res, JSON.parse(jsonString), function (err, result) {
            JRPCServer.output(res, err || result);
          });
        });
      case 'GET':
        var jsonRequest = url.query;
        try {
          if (typeof jsonRequest.params === 'string') jsonRequest.params = JSON.parse(jsonRequest.params);
        } catch (err) {
          return JRPCServer.output(res, _generateError(null, "Parse Error", err + ". Cannot parse message body: " + jsonString)); 
        }
        return _dispatchInternal(res, jsonRequest, function (err, result) {
          JRPCServer.output(res, err || result);
        });
      default: //Only accept GET & POST methods
        return _handleInvalidRequest(400, 'Method can only be GET or POST', res);
    }
  };

}).call(this);
