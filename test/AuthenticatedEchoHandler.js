var AuthenticatedEchoHandler = function () {
	return {
		name : 'AuthenticatedEchoHandler',
		echo : function(context, str) {
			if (!context.user || !context.token) {
				throw new Error("This call has to be authenticated");
			}
			return str;
		}
	};
};

module.exports = AuthenticatedEchoHandler;
