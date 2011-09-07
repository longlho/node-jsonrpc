function extend(a, b) {
    for (method in b) {
        a[method] = b[method];
    }
}

var JRPCServer = {
    customPaths: { //Allow custom handlers for certain paths
        'version': function() {
            return '0.1.0';
        }
    },
    
    errors: {
        'Parse Error': -32700,
        'Invalid Request': -32600,
        'Method Not Found': -32601,
        'Invalid Params': -32602,
        'Internal Error': -32603
    },
    
    newErrorResponse: function(reqId, errorName, errorMessage, errorData) {
        var errors = JRPCServer.errors;
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
            'Content-Type' : 'application/json',
            'Transfer-Enconding' : 'chunked'
        });
        res.end(jsonResponse);
    },
    
    dispatch: function(jsonRequest, res) {
        JRPCServer.output(jsonRequest, res);
    },
    
    handle: function(req, res) {
        var jsonRequest = {};
        var url;
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
        } catch(e) {
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
            JRPCServer.customPaths[url](url, res);
            res.end();
        }
        if (req.method == 'POST') {
            jsonString = "";
            req.on('data', function(chunk) {
                jsonString += chunk;
            });
            try {
                jsonRequest = JSON.parse(jsonString);
            }
            catch (err) {
                JRPCServer.output(JRPCServer.newErrorResponse(null, "Parse Error", "Cannot parse message body: " + jsonString));
            }
        }
        else if (req.method == 'GET') { //Allow GET method with param json=<json_string>
            jsonRequest = url.query.json;
        }
        JRPCServer.dispatch(jsonRequest, res);
    }
    
};
extend(exports, JRPCServer);