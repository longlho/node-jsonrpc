var AuthenticatedEchoHandler = function () {
	return {
		name : 'AuthenticatedEchoHandler',
		echo : function(context, str) {
			return str;
		}
	};
};

module.exports = AuthenticatedEchoHandler;
