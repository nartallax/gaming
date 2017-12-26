/*

minecraft update status server by Nartallax

nartallax@gmail.com

*/
"use strict";

var log = require('./log.js'),
	config = require('./config.js'),
	http = require('http'),
	url = require('url');
	
log("Log initialized.");

var client = ((clientZipPath, clientFolderPath, pathRegexp, hashSeed, clientTimeout, timeToUnpack) => {
	
	var locks = require('./locks.js'), fs = require('fs'), unzip = require('unzip'), xxhash = require('xxhashjs');
	
	var e = cb => (e, d) => { (e && log(e)), cb(d) }
	var withLock = (name, cb) => locks.acquire(name, () => cb(() => locks.free(name)))
	var unzipFile = (f, t, cb) => fs.createReadStream(f).pipe(unzip.Extract({ path: t })).on("close", cb);
	var hashFile = (path, cb) => fs.readFile(path, e(d => cb(hashData(d))))
	var hashData = data => xxhash(hashSeed).update(data).digest().toString(16).toUpperCase();
	
	var fileInfo = (path, cb) => fs.exists(path, ex => !ex? cb(): fs.lstat(path, e(cb)))
	var rm = (path, cb) => fileInfo(path, s => !s? cb(): s.isDirectory()? rmDir(path, cb): fs.unlink(path, e(cb)));
	var rmDir = (path, cb) => {
		var wcb = () => fs.rmdir(path, e(cb));
		fs.readdir(path, e(l => {
			var count = l.length;
			count? l.forEach(f => rm(path + "/" + f, () => ((--count) <= 0) && wcb())): wcb();
		}))
	};
	
	var eachFileIn = (path, body, cb) => fileInfo(path, s => {
		if(!s) return cb();
		if(!s.isDirectory()) return body(path, cb);
		fs.readdir(path, e(l => {
			var count = l.length;
			count? l.forEach(f => eachFileIn(path + '/' + f, body, () => ((--count) <= 0) && cb())): cb();
		}));
	});
	
	var getUpdateTime = cb => fs.stat(clientZipPath, e(s => cb(s? Math.round(s.mtime.getTime() / 1000): 0)));
	var purgeClientDir = cb => {
		log("Purging client directory...");
		rm(clientFolderPath, () => fs.mkdir(clientFolderPath, e(() => { log("Purged."), cb() })))
	}
	var unzipClient = cb => { log("Extracting client files..."), unzipFile(clientZipPath, clientFolderPath, () => { log("Extracted."), cb() }) }
	var getClientFilesHash = cb => {
		log("Hashing client files...");
		var hashes = [];
		
		var after = () => {
			var finalHash = hashData(hashes.sort().join(''));
			log("Hashed: " + finalHash);
			cb(finalHash);
		}
		
		var onFile = (path, cb) => {
			//log(path + " -> " + path.substr(clientFolderPath.length + 1) + " -> " + path.substr(clientFolderPath.length + 1).match(pathRegexp))
			if(path.substr(clientFolderPath.length + 1).match(pathRegexp)){
				hashFile(path, h => { 
					//log(h + " <- " + path);
					onHash(h);
					cb(); 
				})
			} else cb();
		}
		var onHash = h => hashes.push(h)
		
		eachFileIn(clientFolderPath, onFile, after)
		
	}
	var unpackClient = cb => {
		log("Client unpacking started.");
		purgeClientDir(() => {
			unzipClient(() => {
				getClientFilesHash(hash => {
					clientFilesHash = hash;
					log("Client unpacking finished.");
					cb();
				});
			});
		});
	}
	
	var registeredUpdateTime = 0, clientFilesHash = 0;
	var checkUpdate = () => {
		withLock("client_update", free => {
			getUpdateTime(time => {
				if(!time) return free();
				if(time !== registeredUpdateTime){
					log("Update found with time " + time);
					log("Waiting for file to flush...")
					setTimeout(() => {
						log("Waiting finished.");
						
						getUpdateTime(newTime => {
							if(newTime !== time){
								log("Seems like file not done yet. Won't process it right now.");
								free();
							} else {
								log("Seems like file is done. Let's process it.");
								
								var isCompleted = false;
						
								var afterUnpack = () => {
									isCompleted = true;
									registeredUpdateTime = time;
									free();
								};
								
								var tryUnpack = () => {
									setTimeout(() => {
										if(!isCompleted){
											log("Failed to unpack client for given time! Restarting the unpacking process.");
											tryUnpack();
										} else {
											log("Post-unpack check successful.");
										}
									}, timeToUnpack);
									
									unpackClient(afterUnpack);
								}
								
								tryUnpack();
							
							}
						});
						
					}, clientTimeout)
				} else free();
			});
		});		
	}
	
	setInterval(checkUpdate, 1000);
	checkUpdate();
	
	return {
		getUpdateTime: () => registeredUpdateTime,
		getHash: () => clientFilesHash
	};
	
})(config.paths.client, config.paths.clientUnpackDir, config.pathRegexp, config.hashSeed, config.freshClientTimeout, config.timeToUnpack);

var api = {
	getClient: res => {
		var fs = require('fs'), path = config.paths.client;
		fs.stat(path, (err, stat) => {
			
			if(err) log(err);
			
			res.writeHead(200, {
				'Content-Type': 'application/zip',
				'Content-Length': stat.size,
				'Content-Disposition': 'attachment; filename="Poligona-client.zip"'
			});
			
			fs.createReadStream(path).pipe(res)
			
		});
	},
	index: res => {
		res.writeHead(200, { 'Content-Type': 'text/json', "Access-Control-Allow-Origin": "*" });
		var time = client.getUpdateTime(), hash = client.getHash();
		res.write(JSON.stringify((time && hash)? 
			{success: true, data: { client_time: time + '', client_hash: hash }}: 
			{success: false}
		));
		res.end();
	}
}

var processRequest = (req, res) => {
	var requestedUrl = url.parse(req.url, true);
	var functionName = ((requestedUrl.pathname.match(/\/[^\/]+\/?$/) || [])[0] || '').replace(/(^\/|\/$)/g, "");	
	(api[functionName] || api.index)(res);
}

var port = config.server.port || 80;
log("Starting the server on port " + port);

http.createServer(processRequest).listen(port, () => log("Server started."));