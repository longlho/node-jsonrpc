var JRPCServer = (function () {
	
	var	_errors = {
			'Parse Error': -32700,
		        'Invalid Request': -32600,
		        'Method Not Found': -32601,
		        'Invalid Params': -32602,
		        'Internal Error': -32603
		},
	    	_modules = {},
		_generateError = function(reqId, errorName, errorMessage, errorData) {
			if (!(errorName in _errors))
				errorName = 'Internal Error';
		            
		        return {
		            	jsonrpc: '2.0',
		            	error: {
		                	code: _errors[errorName],
		                	message: errorName + '. ' + errorMessage,
		                	data: errorData
		            	},
		            	id: reqId
		        };
		},
		_dispatch = function(jsonRequest) {
		        if (!jsonRequest) return _generateError(null, 'Invalid Request', 'No request found');
			if (!jsonRequest.id) return _generateError(null, 'Invalid Request', 'ID must be specified');
			if (!jsonRequest.method) return _generateError(jsonRequest.id, 'Invalid Request', 'Method must be specified');        
				
		        var 	reqId = jsonRequest.id,
				methodArr = jsonRequest.method.split('\.'),
				handler = _modules[methodArr[0]];
					
			if (!handler || !handler.hasOwnProperty(methodArr[1]))
			    return _generateError(reqId, 'Method Not Found', handler + " doesn't have " + jsonRequest.method);
				
			var 	response,
				parameters = jsonRequest.params;
					
			try {
				if (!Array.isArray(parameters)) {
					parameters = [];
					var 	i,
						paramList = handler[methodArr[1]].toString().match(/\(.*?\)/)[0].match(/[\w]+/g);
						
					for (i = 0; i < paramList.length; i++) {
						parameters.push(jsonRequest.params[paramList[i]]);
					}
			    	} 
			    	response = handler[methodArr[1]].apply(handler, parameters);
			} catch (e) { 
			    	return _generateError(reqId, 'Internal Error', e);
			}
				
			return {
			   	jsonrpc : '2.0',
			   	result : response,
			   	id : reqId
			};
		},
		_handleInvalidRequest = function(code, message, res) {
			res.writeHead(code, {
				'Content-Length': message.length,
		            	'Content-Type': 'text/plain'
		        });
		        res.end(message);
		};
    
    	return {
	    	registerModule: function(module) {
			_modules[module.name] = module;
		},
		customPaths: { //Allow custom handlers for certain paths
			'/version': function(url, res) { JRPCServer.output('0.1.0', res); }
		},
		output: function(jsonResponse, res) {
			res.writeHead(200, {
		            'Content-Type': 'application/json',
		            'Transfer-Enconding': 'chunked'
		        });
		        res.end(JSON.stringify(jsonResponse));
		},
		
		handle: function(req, res) {
		        var 	jsonRequest = {},
				url;
		        
		        //Only accept GET & POST methods
		        if (req.method != 'POST' && req.method != 'GET')
		            	return _handleInvalidRequest(400, 'Method can only be GET or POST', res);
		        
		        //Parse the URL
		        try { 
		        	url = require('url').parse(req.url, true); 
		        }
		        catch (e) { 
		        	return _handleInvalidRequest(400, 'Malformed Request', res); 
		        }
		        
		        //Allow certain paths to go thru
		        if (url.pathname in JRPCServer.customPaths) {
				try { 
					JRPCServer.customPaths[url.pathname](url, res); 
		            	} 
		            	catch (er) { 
		            		_handleInvalidRequest(400, 'Error resolving path' + url.pathname, res); 
		            	}
		            	return;
		        }
		        
		        if (req.method == 'POST') {
		            	//Grab POST request
		            	jsonString = "";
		            	req.on('data', function(chunk) { jsonString += chunk; });
		            	req.on('end', function() {
					if (!jsonString.length)
						return _handleInvalidRequest(400, 'Body should not be empty in the request', res);
					try { 
						jsonRequest = JSON.parse(jsonString); 
					}
			                catch (err) { 
			                	return JRPCServer.output(_generateError(null, "Parse Error", err + ". Cannot parse message body: " + jsonString), res); 
			                }
			                JRPCServer.output(_dispatch(jsonRequest), res);
		            	});
		        }
		        else if (req.method == 'GET') { //Allow GET method with params following JSON-RPC spec
				jsonRequest = url.query;
			    	jsonRequest.params = JSON.parse(jsonRequest.params);
		            	JRPCServer.output(_dispatch(jsonRequest), res);
			}
		}
	}    
})();

module.exports = JRPCServer;
