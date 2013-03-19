/*jslint laxcomma:true, expr:true*/
var http = require('http')
  , vows = require('vows')
  , events = require('events')
  , assert = require('assert')
  , jrpcs = require('../njrpc')
  , Helper = require('./helper')
  , BasicTestSuite = require('./BasicTestSuite');

vows.describe('Node-JsonRPC Server')
.addBatch({
  'after start (charset=none)' : Helper.extend(BasicTestSuite({ charset: 'none' }), {
    'when received POST request w/ method EchoHandler.echo and unicode param' : {
      topic : function () {
        var promise = new events.EventEmitter()
          , body = Helper.samplePostRequest("EchoHandler.echo", ['unicode \u0422\u0440\u044f\u0431\u0432\u0430'], 2);
        //This echoes both success and error since we still get the response but there's a parse
        // error in the socket layer.
        http
          .request(Helper.getOptions(), function (res) { promise.emit('success', res); })
          .on('error', function (err) {
            promise.emit('error', err);
          })
          .end(body);
        return promise;
      },
      'should get an error': function (err, res) {
        //Only check when res is not there, which ignores the success emit.
        if (!res) {
          assert(err);
        }
      },
      'should give back a bad response' : {
        topic : Helper.parseResponse,
        'should not be able to parse': function (err, json) {
          //Bad JSON expected, because of the multibyte diference (content-length is shorter)
          assert(err);
        }
      }
    }
  })
})
.addBatch({
  'after start (charset=none, encodeUnicodeAsASCII=true)' : Helper.extend(BasicTestSuite({
    charset: 'none',
    encodeUnicodeAsASCII: true
  }), {
    'when received POST request w/ method EchoHandler.echo and unicode param' : {
      topic : function () {
        var promise = new events.EventEmitter()
          , body = Helper.samplePostRequest("EchoHandler.echo", ['unicode \u0422\u0440\u044f\u0431\u0432\u0430'], 2);
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
          assert.equal(json.result, 'unicode \u0422\u0440\u044f\u0431\u0432\u0430');
        }
      }
    }
  })
})
.addBatch({
  'after start (charset=UTF-8)' : Helper.extend(BasicTestSuite({ charset: 'UTF-8' }), {
    'when received POST request w/ method EchoHandler.echo and unicode param' : {
      topic : function () {
        var promise = new events.EventEmitter()
          , body = Helper.samplePostRequest("EchoHandler.echo", ['unicode \u0422\u0440\u044f\u0431\u0432\u0430'], 2);
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
          assert.equal(json.result, 'unicode \u0422\u0440\u044f\u0431\u0432\u0430');
        }
      }
    }
  })
})
.addBatch({
  'after start (charset=UTF-8, encodeUnicodeAsASCII=true)' : Helper.extend(BasicTestSuite({
    charset: 'UTF-8',
    encodeUnicodeAsASCII: true
  }), {
    'when received POST request w/ method EchoHandler.echo and unicode param' : {
      topic : function () {
        var promise = new events.EventEmitter()
          , body = Helper.samplePostRequest("EchoHandler.echo", ['unicode \u0422\u0440\u044f\u0431\u0432\u0430'], 2);
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
          assert.equal(json.result, 'unicode \u0422\u0440\u044f\u0431\u0432\u0430');
        }
      }
    }
  })
})
.export(module);

