/*

minecraft information server by Nartallax

nartallax@gmail.com

*/
"use strict";

var log = require('./log.js'),
	config = require('./config.js'),
	http = require('http');
	
log("Log initialized.");

var getInfo = ((file, freq, margin) => {
	
	var fs = require('fs');
	
	var doRead = cb => fs.readFile(file, 'utf8', (err, data) => {
		(err && log(err)), cb(err? {success: false}: {success: true, data: JSON.parse(data)})
	});
	
	var readWithCheck = cb => {
		fs.stat(file, (err, statData) => {
			if(err){
				log(err);
				cb({success: false});
			} else {
				var fileTime = statData.mtime.getTime();
				var curTime = Date.now();
				var timeDiff = curTime - fileTime;
				
				if(timeDiff > (freq + margin)){
					log("File outdated! Limit: " + (freq + margin) + ", file age: " + timeDiff);
					cb({success: false});
				} else {
					doRead(cb);
				}
			}
		});
	}
	
	var lastUpdate = 0;
	var cache = undefined;
	
	var isUpdating = false;
	var afterUpdate = [];
	
	return cb => {
	
		if(Date.now() - lastUpdate < freq){
			cb(cache);
		} else {
			afterUpdate.push(cb);
			if(!isUpdating) {
				isUpdating = true;
				readWithCheck(data => {
					isUpdating = false;
					lastUpdate = Date.now();
					cache = data;
					afterUpdate.forEach(cb => cb(data));
					afterUpdate = [];
				});
			}
		}
		
	};
	
})(config.paths.dataFile, config.updateFrequency, config.updateMargin);

var processRequest = (req, res) => {
	getInfo(data => {
		res.writeHead(200, { 'Content-Type': 'text/json', "Access-Control-Allow-Origin": "*" });
		res.write(JSON.stringify(data));
		res.end();
	});
}

var port = config.server.port || 80;
log("Starting the server on port " + port);

http.createServer(processRequest).listen(port);
