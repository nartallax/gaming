module.exports = {
	server: {
		port: 83,
		connectionQueueSize: 0x01ff
	},
	
	paths: {
		client: "/home/nartallax/web_root/client.zip",
		clientUnpackDir: "./client"
	},
	
	pathRegexp: /^(asm|libraries|resourcepacks|scripts|server-resource-packs|versions|mods.*?\.jar$)/,
	
	hashSeed: 0xfeedfeed,
	freshClientTimeout: 10000, 
	timeToUnpack: 90000 
};