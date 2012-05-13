/**
 * Some notes: 
 * interceptor is a request interceptor that can inject extra "hidden" params into
 * request object (for authentication and things of that purpose). It can also reject the request
 * by throwing exception, which will be returned to sender.
 */
(function () {

  var root = this;

  var URL = require('url')
  , EventEmitter = require('events').EventEmitter
  , Util = require('util');

  var JRPCServer = function () {

    EventEmitter.call(this);
    var _this = this;

    var _generateError = function (reqId, errorName, errorMessage, errorData) {
      if (!(errorName in _this.errors)) errorName = 'Internal Error';
      return {
        jsonrpc: '2.0',
        error: {
          code: _this.errors[errorName],
          message: errorName + '. ' + errorMessage,
          data: errorData
        },
        id: reqId
      };
    };

    var _dispatchInternal = function (res, jsonRequest) {

      var _next = function () {
        var jReq = _next.caller.arguments[0];
        if (arguments.length && arguments[0] instanceof Error) {
          return _this.output(res, _generateError(jReq.id, 'Internal Error', arguments[0].message));
        }
        return _dispatchSingle(jReq, function (err, result) {
          _this.output(res, err || result);
        });
      };

      var _batchNext = function () {
        var jReq = _batchNext.caller.arguments[0];
        if (arguments.length && arguments[0] instanceof Error) {
          return _this.output(res, _generateError(jReq.id, 'Internal Error', arguments[0].message));
        }
        return _dispatchSingle(jReq, function (err, result) {
          results.push(err || result);
          if (results.length === jsonRequest.length) {
            _this.output(res, results);
          }
        });
      }

      // Invoke delegation to intercept request object
      if (!Array.isArray(jsonRequest)) {
        return _this.interceptor.call(null, jsonRequest, _next);
      } else {
        // handles batching calls
        var results = [];
          for (var i = 0; i < jsonRequest.length; i++) {
            _this.interceptor.call(null, jsonRequest[i], _batchNext);
          }
      }

    };

    var _dispatchSingle = function (jReq, callbackFn) {
      if (!jReq) return callbackFn(_generateError(null, 'Invalid Request', 'No request found'));
      if (!jReq.id) return callbackFn(_generateError(null, 'Invalid Request', 'ID must be specified'));
      if (!jReq.method) return callbackFn(_generateError(jReq.id, 'Invalid Request', 'Method must be specified'));
      var reqId = jReq.id
      , methodArr = jReq.method.split('\.')
      , handler = _this.modules[methodArr[0]];

      if (!handler || !handler.hasOwnProperty(methodArr[1])) {
        return callbackFn(_generateError(reqId, 'Method Not Found', handler + " doesn't have " + jReq.method));
      }
      var parameters = jReq.params;
      try {
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

    this.errors = {
      'Parse Error': -32700,
      'Invalid Request': -32600,
      'Method Not Found': -32601,
      'Invalid Params': -32602,
      'Internal Error': -32603
    };
    this.modules = {};
    this.paths = {
      '/version': function (req, res) { return _this.output(res, '1.0.3'); }
    };
    this.interceptor = function (jReq, next) { next(); };



    /**
     * Register a module/list of modules to expose RPC calls.
     * @param Array/Object modules module to register
     */
    this.register = function (modules) {
      if (Array.isArray(modules)) {
        for (var i = 0; i < modules.length; i++) {
          this.modules[modules[i].name] = modules[i];
        }
      }
      else {
        this.modules[modules.name] = modules;
      }
    };

    /**
     * Write out a JSON-formatted response.
     * @param Object res NodeJS response object
     * @param Object jsonResponse JSON object to write out
     */
    this.output = function (res, jsonResponse) {
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
     */
    this.handle = function (req, res) {
      //Parse the URL
      var url = URL.parse(req.url, true);
      //Allow certain paths to go thru
      if (url.pathname in this.paths) {
        return this.paths[url.pathname](req, res);
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
          catch (err) { return _this.output(res, _generateError(null, "Parse Error", err + ". Cannot parse message body: " + jsonString)); }
          return _dispatchInternal(res, JSON.parse(jsonString), function (err, result) {
            _this.output(res, err || result);
          });
        });
        case 'GET':
          var jsonRequest = url.query;
        try {
          if (typeof jsonRequest.params === 'string') jsonRequest.params = JSON.parse(jsonRequest.params);
        } catch (err) {
          return _this.output(res, _generateError(null, "Parse Error", err + ". Cannot parse message body: " + jsonString)); 
        }
        return _dispatchInternal(res, jsonRequest);
        default: //Only accept GET & POST methods
          return _handleInvalidRequest(400, 'Method can only be GET or POST', res);
      }
    };

  };

  Util.inherits(JRPCServer, EventEmitter);

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = new JRPCServer();
    }
  } else {
    root.JRPCServer = new JRPCServer();
  }

}).call(this);
