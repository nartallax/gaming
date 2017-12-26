module.exports = {
	server: {
		port: 81,
		connectionQueueSize: 0x01ff
	},
	
	paths: {
		frontendPage: "./index.html",
		userDir: "./users/",
		keyFile: "./key"
	},
	
	maxBanReasonLength: 10000,
	maxPrefixLength: 15,
	maxColorLength: 3,
	maxChannelNameLength: 32,
	maxChannelPasswordLength: 32,
	maxNickLength: 15
};