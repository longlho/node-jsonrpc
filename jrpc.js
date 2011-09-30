function extend(a, b) {
    for (method in b) {
        a[method] = b[method];
    }
}
var JRPCServer = {
	
    _errors: {
        'Parse Error': -32700,
        'Invalid Request': -32600,
        'Method Not Found': -32601,
        'Invalid Params': -32602,
        'Internal Error': -32603
    },
    
    _modules: {},
    
    _generateError: function(reqId, errorName, errorMessage, errorData) {
        var errors = JRPCServer._errors;
        if (!(errorName in errors)) {
            errorName = 'Internal Error';
        }
        return {
            jsonrpc: '2.0',
            error: {
                code: errors[errorName],
                message: errorName + '. ' + errorMessage,
                data: errorData
            },
            id: reqId
        };
    },
    
    _dispatch: function(jsonRequest) {
        if (!jsonRequest) {
	    return JRPCServer._generateError(null, 'Invalid Request', 'No request found');
	}
        if (!jsonRequest.hasOwnProperty('id')) {
            return JRPCServer._generateError(null, 'Invalid Request', 'ID must be specified');
        }
        var reqId = jsonRequest.id;
        if (!jsonRequest.hasOwnProperty('method')) {
            return JRPCServer._generateError(reqId, 'Invalid Request', 'Method must be specified');
        }

	var methodArr = jsonRequest.method.split('\.');
	var handler = JRPCServer._modules[methodArr[0]];
	if (!handler || !handler.hasOwnProperty(methodArr[1])) {
	    return JRPCServer._generateError(reqId, 'Method Not Found', jsonRequest.method);
	}
	var response;
	try {
	    if (Array.isArray(jsonRequest.params)) {
		response = handler[methodArr[1]].apply(handler, jsonRequest.params);
	    } else {
		console.log(handler[methodArr[1]]);    
	    } 
	} catch (e) { 
	    return JRPCServer._generateError(reqId, 'Internal Error', e);
	}
	
	return {
	   jsonrpc : '2.0',
	   result : response,
	   id : reqId
	};
    },
    
    _handleInvalidRequest : function(code, message, res) {
        res.writeHead(code, {
            'Content-Length': message.length,
            'Content-Type': 'text/plain'
        });
        res.end(message);
    },    

    registerModule: function(module) {
	JRPCServer._modules[module.name] = module;
    },

    customPaths: { //Allow custom handlers for certain paths
        '/version': function(url, res) {
            JRPCServer.output('0.1.0', res);
        }
    },
    
    output: function(jsonResponse, res) {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Enconding': 'chunked'
        });
        res.end(JSON.stringify(jsonResponse));
    },

    handle: function(req, res) {
        var jsonRequest = {};
        var url, response;
        
        //Only accept GET & POST methods
        if (req.method != 'POST' && req.method != 'GET') {
            JRPCServer._handleInvalidRequest(400, 'Method can only be GET or POST', res);
            return;
        }
        
        //Parse the URL
        try {
            url = require('url').parse(req.url, true);
        }
        catch (e) {
            _JRPCServer._handleInvalidRequest(400, 'Malformed Request', res);
            return;
        }
        
        //Allow certain paths to go thru
        if (url.pathname in JRPCServer.customPaths) {
            try {
                JRPCServer.customPaths[url.pathname](url, res);
                res.end();
            } catch (er) {
                JRPCServer._handleInvalidRequest(400, 'Error resolving path' + url.pathname, res);
            }
            return;
        }
        
        if (req.method == 'POST') {
            //Grab POST request
            jsonString = "";
            req.on('data', function(chunk) {
                jsonString += chunk;
            });
            req.on('end', function() {
		if (!jsonString.length) {
		    JRPCServer._handleInvalidRequest(400, 'Body should not be empty in the request', res);
		    return;
		}
                try {
                    jsonRequest = JSON.parse(jsonString);
                }
                catch (err) {
                    JRPCServer.output(JRPCServer._generateError(null, "Parse Error", err + ". Cannot parse message body: " + jsonString), res);
                    return;
                }
                response = JRPCServer._dispatch(jsonRequest);
                JRPCServer.output(response, res);
            });
        }
        else if (req.method == 'GET') { //Allow GET method with params following JSON-RPC spec
            jsonRequest = url.query;
	    console.log(url.query);
            response = JRPCServer._dispatch(jsonRequest);
            JRPCServer.output(response, res);
        }
    }
    
};
extend(exports, JRPCServer);
