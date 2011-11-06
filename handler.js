this.init = function () {
	return {
		name : 'EchoHandler',
		echo : function(str) {
			return str;
		},
		echoArray : function(str1, str2) {
			return str1 + str2;
		}
	};
};
