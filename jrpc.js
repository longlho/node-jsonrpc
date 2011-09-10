function extend(a, b) {
    for (method in b) {
        a[method] = b[method];
    }
}
var JRPCServer = {
    
    customPaths: { //Allow custom handlers for certain paths
        '/version': function(url, res) {
            JRPCServer.output('0.1.0', res);
        },
	'/modules': function(url, res) {
	    JRPCServer.output(JRPCServer._modules, res);
	}
    },
    
    _errors: {
        'Parse Error': -32700,
        'Invalid Request': -32600,
        'Method Not Found': -32601,
        'Invalid Params': -32602,
        'Internal Error': -32603
    },
    
    _modules: {},
    
    registerModule: function(module) {
        JRPCServer._modules[module.name] = module;
    },
    
    generateError: function(reqId, errorName, errorMessage, errorData) {
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
    
    output: function(jsonResponse, res) {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Enconding': 'chunked'
        });
        res.end(JSON.stringify(jsonResponse));
    },
    
    dispatch: function(jsonRequest) {
	if (!jsonRequest) {
	    return JRPCServer.generateError(null, 'Invalid Request', 'No request found');
	}
        if (!jsonRequest.hasOwnProperty('id')) {
            return JRPCServer.generateError(null, 'Invalid Request', 'ID must be specified');
        }
        var reqId = jsonRequest.id;
        if (!jsonRequest.hasOwnProperty('method')) {
            return JRPCServer.generateError(reqId, 'Invalid Request', 'Method must be specified');
        }
	var methodArr = jsonRequest.method.split('\.');
	var handler = JRPCServer._modules[methodArr[0]];
	if (Array.isArray(jsonRequest.params)) {
	   return handler[methodArr[1]].apply(handler, jsonRequest.params);
	}
        else 
	   return {};
    },
    
    handle: function(req, res) {
        var jsonRequest = {};
        var url, response;
        //Only accept GET & POST methods
        if (req.method != 'POST' && req.method != 'GET') {
            error = 'Method can only be GET or POST';
            res.writeHead(400, {
                'Content-Length': error.length,
                'Content-Type': 'text/plain'
            });
            res.end(error);
            return;
        }
        //Parse the URL
        try {
            url = require('url').parse(req.url, true);
        }
        catch (e) {
            error = 'Malformed Request';
            res.writeHead(400, {
                'Content-Length': error.length,
                'Content-Type': 'text/plain'
            });
            res.end(error);
            return;
        }
        //Allow certain paths to go thru
        if (url.pathname in JRPCServer.customPaths) {
            JRPCServer.customPaths[url.pathname](url, res);
            res.end();
            return;
        }
        if (req.method == 'POST') {
            jsonString = "";
            req.on('data', function(chunk) {
                jsonString += chunk;
            });
            req.on('end', function() {
                try {
                    jsonRequest = JSON.parse(jsonString);
                }
                catch (err) {
                    JRPCServer.output(JRPCServer.generateError(null, "Parse Error", err + ". Cannot parse message body: " + jsonString), res);
                    return;
                }
                response = JRPCServer.dispatch(jsonRequest);
                JRPCServer.output(response, res);
            });
        }
        else if (req.method == 'GET') { //Allow GET method with param json=<json_string>
            jsonRequest = url.query.json;
            response = JRPCServer.dispatch(jsonRequest);
            JRPCServer.output(response, res);
        }
    }
};
extend(exports, JRPCServer);
