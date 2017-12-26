var log = (message) => {

	switch(typeof(message)) {
		case "function":message = "[some function]";		break;
		case "object": 	message = JSON.stringify(message);	break;
		case "boolean":	message = message? 'true': 'false'; break;
		default: 											break;
	}
	
	console.log(Date.now() + ' ' + message);
	
	return log;
};

module.exports = log;