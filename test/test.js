var http = require('http')
,   vows = require('vows')
,   events = require('events')
,   assert = require('assert')
,   jrpcs = require('../njrpc')
,   Helper = require('./helper')
,   EchoHandler = require('./EchoHandler')
,   AuthenticatedEchoHandler = require('./AuthenticatedEchoHandler')
,   preHandler = function(jsonReq, next) {
  if (jsonReq && jsonReq.method && jsonReq.method.indexOf('Authenticated') >= 0 && !jsonReq.headers) {
    return next(new Error('Authentication required'));
  }
  if (jsonReq.headers) {
    if (Array.isArray(jsonReq.params)) {
      jsonReq.params.unshift(jsonReq.headers);
    }
    else {
      jsonReq.params.context = jsonReq.headers;
    }
  }
  return next();
}
,   server = http.createServer(function(req, res) {
  // Register the handlers with JRPC
  jrpcs.register([new EchoHandler(), new AuthenticatedEchoHandler()]);
  jrpcs.interceptor = preHandler;
  jrpcs.handle(req, res);
});



vows.describe('Node-JsonRPC Server').addBatch({
  'after start' : {
    topic : function () {
      server.listen(4000, 'localhost', this.callback);
    },
    'when received empty POST request' : {
      topic : function () {
        http.request(Helper.getOptions(), this.callback).end();    
      },
      'should give back a bad response' : function (res, err) {
        Helper.checkBadResponse(res);    
      }
    },
    'when received empty GET request' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        options = Helper.getOptions();
        options.method = 'GET';
        http.request(options, function (res) { promise.emit('success', res); }).end();
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(null, json.id);
        },
        'that has error' : function (json) {
          assert.ok(json.error, "Should be error");
        },
        'that has method not found error message' : function (json) {
          assert.ok(json.error.message.indexOf("ID must be specified") > -1, "Error message should be Method Not Found, but was " + JSON.stringify(json.error));
        }

      }
    },
    'when received GET request w/ method not found' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        options = Helper.getOptions();
        options.method = 'GET';
        options.path = "/" + Helper.sampleGetRequest("Method.doesNotExist", [], 1);
        http.request(options, function (res) { promise.emit('success', res); }).end();
        return promise;    
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(1, json.id);
        },
        'that has error' : function (json) {
          assert.ok(json.error, "Should be error");
        },
        'that has method not found error message' : function (json) {
          assert.ok(json.error.message.indexOf("Method Not Found") > -1, "Error message should be Method Not Found, but was " + JSON.stringify(json.error));
        }
      }
    },
    'when received GET request w/ method EchoHandler.echo' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        options = Helper.getOptions();
        options.method = 'GET';
        options.path = "/" + Helper.sampleGetRequest("EchoHandler.echo", ['test'], 2);
        http.request(options, function (res) { promise.emit('success', res); }).end();
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(2, json.id);
        },
        'that has no error' : function (json) {
          assert.ok(!json.error, "Should not be error " + JSON.stringify(json));
        },
        'that has same result as request param' : function (json) {
          assert.equal(json.result, 'test');
        }
      }
    },
    'when received POST request w/ method EchoHandler.echo' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        body = Helper.samplePostRequest("EchoHandler.echo", ['test'], 2);
        http.request(Helper.getOptions(), function (res) { promise.emit('success', res); }).end(body);
        return promise;    
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(2, json.id);
        },
        'that has no error' : function (json) {
          assert.ok(!json.error, "Should not be error " + JSON.stringify(json));
        },
        'that has same result as request param' : function (json) {
          assert.equal(json.result, 'test');
        }
      }
    },
    'when received GET request w/ method EchoHandler.echo and map param' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        options = Helper.getOptions();
        options.method = 'GET';
        options.path = "/" + Helper.sampleGetRequest("EchoHandler.echo", {
          str: 'test'
        }, 2);
        http.request(options, function (res) { promise.emit('success', res); }).end();
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(2, json.id);
        },
        'that has no error' : function (json) {
          assert.ok(!json.error, "Should not be error " + JSON.stringify(json));
        },
        'that has same result as request param' : function (json) {
          assert.equal(json.result, 'test');
        }
      }
    },
    'when received POST request w/ method EchoHandler.echoArray' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        body = Helper.samplePostRequest("EchoHandler.echoArray", ['test post', ' is good'], 20);
        http.request(Helper.getOptions(), function (res) { promise.emit('success', res); }).end(body);
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(20, json.id);
        },
        'that has no error' : function (json) {
          assert.ok(!json.error, "Should not be error " + JSON.stringify(json));
        },
        'that has same result as combo of request params' : function (json) {
          assert.equal(json.result, 'test post is good');
        }
      }
    },
    'when received batch of 2 POST requests' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        reqs = [
          Helper.samplePostRequest("EchoHandler.echo", ['test'], 99, 'object'), 
          Helper.samplePostRequest("EchoHandler.echo", ['test2'], 98, 'object')
        ];
        http.request(Helper.getOptions(), function (res) { promise.emit('success', res); }).end(JSON.stringify(reqs));
        return promise;
      },
      'should produce a list of responses' : {
        topic : Helper.parseResponse,
        'that has no error' : function (json) {
          assert.ok(!json.error, "Should not be error " + JSON.stringify(json));
        },
        'that has 2 responses' : function (json) {
          assert.equal(json.length, 2);
        },
        'that has responses for both requests' : function (json) {
          var i, found99, found98;
          for (i = 0; i < json.length; i++) {
            if (json[i].id == 99) {
              found99 = true;
              assert.equal(json[i].result, 'test');
            }
            else if (json[i].id == 98) {
              found98 = true;
              assert.equal(json[i].result, 'test2');
            }
          }
          assert.ok(found99 && found98);
        }
      }
    },
    'when received authenticated POST map request' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        req = Helper.samplePostRequest("AuthenticatedEchoHandler.echo", ['test post'], 21, 'object');
        req.headers = {
          user: 'test user',
          token: 123
        };
        http.request(Helper.getOptions(), function(res) { promise.emit('success', res); }).end(JSON.stringify(req));
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(21, json.id);
        },
        'that has no error' : function (json) {
          assert.ok(!json.error, "Should not be error " + JSON.stringify(json));
        },
        'that has same result as combo of request params' : function (json) {
          assert.equal(json.result, 'test post');
        }
      }
    },
    'when received authenticated POST map request w/o a token' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        req = Helper.samplePostRequest("AuthenticatedEchoHandler.echo", {
          str: 'test post'
        }, 21, 'object');
        req.headers = {
          user: 'test user'
        };
        http.request(Helper.getOptions(), function(res) { promise.emit('success', res); }).end(JSON.stringify(req));
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(21, json.id);
        },
        'that has error' : function (json) {
          assert.ok(json.error);
        },
        'that has no result' : function (json) {
          assert.ok(!json.result);
        },
        'that has error message saying missing credential' : function (json) {
          assert.equal(json.error.message, 'Internal Error. Error: This call has to be authenticated');
        }
      }
    },
    'when received authenticated POST request w/o headers' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        req = Helper.samplePostRequest("AuthenticatedEchoHandler.echo", ['test post'], 21, 'object');
        http.request(Helper.getOptions(), function(res) { promise.emit('success', res); }).end(JSON.stringify(req));
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(21, json.id);
        },
        'that has error' : function (json) {
          assert.ok(json.error);
        },
        'that has no result' : function (json) {
          assert.ok(!json.result);
        },
        'that has error message saying missing credential' : function (json) {
          assert.equal(json.error.message, 'Internal Error. Authentication required');
        }
      }
    },
    'when received authenticated POST request w/o a token' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        req = Helper.samplePostRequest("AuthenticatedEchoHandler.echo", ['test post'], 21, 'object');
        req.headers = {
          user: 'test user'
        };
        http.request(Helper.getOptions(), function(res) { promise.emit('success', res); }).end(JSON.stringify(req));
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(21, json.id);
        },
        'that has error' : function (json) {
          assert.ok(json.error);
        },
        'that has no result' : function (json) {
          assert.ok(!json.result);
        },
        'that has error message saying missing credential' : function (json) {
          assert.equal(json.error.message, 'Internal Error. Error: This call has to be authenticated');
        }
      }
    },
    'when received POST request with EchoHandler.echoCallback' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        body = Helper.samplePostRequest("EchoHandler.echoCallback", ['test'], 2);
        http.request(Helper.getOptions(), function(res) { promise.emit('success', res); }).end(body);
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(2, json.id);
        },
        'that has no error' : function (json) {
          assert.ok(!json.error, "Should not be error " + JSON.stringify(json));
        },
        'that has same result as request param' : function (json) {
          assert.equal(json.result, 'test');
        }
      }
    },
    'when received GET request with EchoHandler.echoCallback' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        options = Helper.getOptions();
        options.method = 'GET';
        options.path = "/" + Helper.sampleGetRequest("EchoHandler.echoCallback", ['test'], 2);
        http.request(options, function(res) { promise.emit('success', res); }).end();
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(2, json.id);
        },
        'that has no error' : function (json) {
          assert.ok(!json.error, "Should not be error " + JSON.stringify(json));
        },
        'that has same result as request param' : function (json) {
          assert.equal(json.result, 'test');
        }
      }
    },
    'when received GET request with EchoHandler.echoCallback and map params' : {
      topic : function () {
        var promise = new(events.EventEmitter),
        options = Helper.getOptions();
        options.method = 'GET';
        options.path = "/" + Helper.sampleGetRequest("EchoHandler.echoCallback", {
          str: 'test callback map'
        }, 2);
        http.request(options, function(res) { promise.emit('success', res); }).end();
        return promise;
      },
      'should produce a response' : {
        topic : Helper.parseResponse,
        'that has ID matched' : function (json) {
          assert.equal(2, json.id);
        },
        'that has no error' : function (json) {
          assert.ok(!json.error, "Should not be error " + JSON.stringify(json));
        },
        'that has same result as request param' : function (json) {
          assert.equal(json.result, 'test callback map');
        }
      }
    },
    teardown : function () {
      server.close();
    }
  }
}).export(module);

