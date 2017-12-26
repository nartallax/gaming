/*

authentication server by Nartallax

nartallax@gmail.com

*/
"use strict";

var log = require('./log.js'),
	config = require('./config.js'),
	http = require('http'),
	url = require('url');
	
log("Log initialized.");


log("Preloading frontpage...");
var frontpage = require('fs').readFileSync(config.paths.frontendPage);
log("Done.");

log("Loading security key...");
var apiKey = require('fs').readFileSync(config.paths.keyFile, "utf8");
log("Loaded; it's " + apiKey.length + " characters long.");

log("Creating directories...");
try {
	require('fs').mkdirSync(config.paths.userDir);
} catch(e) {}
log("Done.");

var now = () => Math.round(Date.now() / 1000)

var userFiles = ((dir) => {
	
	var locks = require('./locks.js'), fs = require('fs');
	
	var filenameSeparator = '.'
	var lockName = (nick, id) => 'user_' + nick + '_' + id
	var filename = (nick, id) => nick + filenameSeparator + id
	var nickByFilename = fn => fn.split('.')[0]
	var idByFilename = fn => fn.split('.')[1]
	
	var lock = (nick, id, body) => locks.acquire(lockName(nick, id), () => body(filename(nick, id)))
	var unlock = (nick, id) => locks.free(lockName(nick, id))
	
	var getUserFilenames = cb => fs.readdir(dir, (err, files) => { (err && log(err)), cb(files) })
	var findName = (check, cb) => getUserFilenames(names => {
		var l = names.length;
		while(--l >= 0) if(check(names[l])) return cb(names[l]);
		cb(null);
	});
	var getNickById = (id, cb) => {
		var tail = filenameSeparator + id;
		findName(s => s.endsWith(tail), fn => cb(fn && nickByFilename(fn)));
	}
	var getIdByNick = (nick, cb) => {
		var head = nick + filenameSeparator;
		findName(s => s.startsWith(head), fn => cb(fn && idByFilename(fn)));
	}
	
	var get = (nick, id, cb) => {
		lock(nick, id, fn => 
			fs.readFile(dir + fn, 'utf8', (err, data) => {
				unlock(nick, id), (err && log(err)), cb(JSON.parse(data))
			})
		)
	};
	
	var put = (nick, id, dataObj, cb) => {
		lock(nick, id, fn => 
			fs.writeFile(dir + fn, JSON.stringify(dataObj), err => { 
				unlock(nick, id), (err && log(err)), cb() 
			})
		)
	}
	
	var remove = (nick, id, cb) => {
		fs.unlink(dir + filename(nick, id), err => { (err && log(err)), cb() })
	}
	
	return {
		idByNick: getIdByNick,
		nickById: getNickById,
		byNick: (nick, cb) => getIdByNick(nick, id => id? get(nick, id, cb): cb(id)),
		byId: (id, cb) => getNickById(id, nick => nick? get(nick, id, cb): cb(nick)),
		set: put,
		clear: remove,
		getAllNicks: body => getUserFilenames(files => body(files.map(nickByFilename)))
	}
	
})(config.paths.userDir);

var macIndex = (uf => {
	
	var macIndex = {}, nickIndex = {};
	
	log("Building mac index...");
	var processedUsers = 0;
	
	var link = (mac, nick) => {
		var rec = macIndex[mac] || (macIndex[mac] = {});
		rec[nick] = true;
		
		rec = nickIndex[nick] || (nickIndex[nick] = {});
		rec[mac] = true;
	}
	
	var mapToArr = map => {
		var r = [];
		for(var i in map) r.push(i);
		return r;
	}
	
	var clusterByNick = nick => {
		var macs = {}, nicks = {};
		
		var processMac = mac => {
			if(macs[mac]) return;
			macs[mac] = true;
			
			var nnicks = macIndex[mac] || {};
			for(var i in nnicks) processNick(i);
		}
		
		var processNick = nick => {
			if(nicks[nick]) return;
			nicks[nick] = true;
			
			var nmacs = nickIndex[nick] || {};
			for(var i in nmacs) processMac(i);
		}
		
		processNick(nick);
		
		return {macs: mapToArr(macs), nicks: mapToArr(nicks)};
	}
	
	var after = () => log("Mac index builded.")
	
	uf.getAllNicks(nicks => {
		var counter = 0;
		if(nicks.length === 0) after();
		
		nicks.forEach(nick => uf.byNick(nick, data => {
			(data.macs || []).forEach(m => link(m, nick))
			
			counter++;
			if(counter >= nicks.length) after();
		}))
	})
	
	return {
		nicks: mac => macIndex[mac],
		macs: nick => nickIndex[mac],
		cluster: nick => clusterByNick(nick),
		link: link
	};
	
})(userFiles);

var voteIndex = (uf => {
	/*
	var voteIndex = {};
	var idCounter = 0;
	
	var joinVote = (id, nick, part) => {
		(voteIndex[id] || (voteIndex[id] = {}))[nick] = part;
	}
	
	var deleteVote = id => delete voteIndex[id];
	
	log("Building vote index...");
	
	var after = () => log("Vote index builded.");
	
	uf.getAllNicks(nicks => {
		if(nicks.length === 0) return after();
		
		var counter = 0;
			
		nicks.forEach(nick => uf.byNick(nick, data => {
			var voteData = data.votes || {};
			for(var id in voteData) joinVote(id, nick, voteData[id]);
			
			counter++;
			if(counter >= nicks.length) cb();
		}))
	})
	
	return {
		vote: joinVote,
		deleteVote: deleteVote
	};
	*/
	
})(userFiles);

var userManager = ((uf, maxBanReasonLength) => {
	
	var keccak = require('./keccak.js');
	
	var validateNick = nick => (nick || '').match(/^[a-zA-Z\-_\d]{2,15}$/)? true: false
	var validateHash = hash => (hash || '').match(/^[a-zA-Z\d]{15}$/)? true: false
	var validateMac = mac => (mac || '').match(/^[\dA-F]{2}(?::[\dA-F]{2}){3,}$/)? true: false
	
	var salt = 'aFqUUIMP04xFxQ6oTFeQg6nnLoszEuL9Fw14TZDvWQ6jZtbw7LwgMZ4rzdYy';
	var hash = smth => keccak(smth + salt).substr(0, 15);
	var newId = cb => {
		var id = hash(Math.random() * 0xffffffff)
		uf.nickById(id, nick => nick? newId(cb): cb(id))
	}
	
	var setPwd = (nick, id, pwd, cb) => {
		pwd = hash(pwd)
		var data = {id: id, nick: nick, pwd: pwd}
		uf.set(nick, id, data, cb)
	}
	
	var getField = (nick, fieldName, orElse, cb) => {
		if(!validateNick(nick)) return cb({status: 'invalid_nick'});
			
		uf.byNick(nick, data => {
			var result = {};
			if(data){
				result.status = 'ok';
				result[fieldName] = data[fieldName] || orElse;
			} else {
				result.status = 'not_registered';
			}
			cb(result);
		})
	}
	
	var putField = (nick, fieldName, getData, cb) => {
		if(!validateNick(nick)) return cb({status: 'invalid_nick'});
			
		uf.byNick(nick, data => {
			if(!data) return cb({status: 'not_registered'})
		
			var result = {status: 'ok'};
			result[fieldName] = data[fieldName] = getData(data[fieldName])
			uf.set(nick, data.id, data, () => cb(result))
		})
	}
	
	var eachNickField = (nick, fieldName, defVal, onNick, afterAll) => {
		var nicks = nicksOf(nick), count = 0;
		
		if(nicks.length === 0) afterAll();
		
		nicks.forEach(nick => uf.byNick(nick, data => {
			if(data) onNick(nick, data[fieldName] || defVal);
		
			count++;
			if(count === nicks.length) afterAll();
		}))
	}
	
	var macsOf = nick => macIndex.cluster(nick).macs
	var nicksOf = nick => macIndex.cluster(nick).nicks
	
	var resetAllBansAt = (nick, cb) => {
		var nicks = nicksOf(nick), count = 0;
		
		if(nicks.length === 0) cb();
		
		nicks.forEach(nick => {
			
			putField(nick, 'ban', () => null, () => {
				count++;
				if(count === nicks.length) cb();
			})
			
		})
	}
	
	return {
		register: (nick, pwd, cb) => { 
			if(!validateNick(nick)) return cb({status: 'invalid_nick'})
			if(!validateHash(pwd)) return cb({status: 'invalid_password'})
			uf.idByNick(nick, id => {
				if(id) return cb({status: 'duplicate_nick'})
				newId(id => setPwd(nick, id, pwd, () => cb({status: 'ok', id: id})))
			})
		},
		getId: (nick, pwd, cb) => {
			if(!validateNick(nick)) return cb({status: 'invalid_nick'})
			if(!validateHash(pwd)) return cb({status: 'invalid_password'})
			pwd = hash(pwd);
			uf.byNick(nick, data => {
				if(!data) return cb({status: 'not_registered'})
				if(data.pwd !== pwd) return cb({status: 'wrong_password'})
				cb({status: 'ok', id: data.id})
			})
		},
		getNick: (id, cb) => {
			if(!validateHash(id)) return cb({status: 'invalid_id'})
			uf.nickById(id, nick => {
				if(!nick) return cb({status: 'not_registered'});
				cb({status: 'ok', nick: nick});
			})
		},
		changePassword: (id, newPwd, cb) => {
			if(!validateHash(id)) return cb({status: 'invalid_id'})
			if(!validateHash(newPwd)) return cb({status: 'invalid_password'})
			uf.byId(id, data => {
				if(!data) return cb({status: 'not_registered'});
				setPwd(data.nick, id, newPwd, () => cb({status: 'ok'}))
			})
		},
		addMacs: (nick, macs, cb) => {
			var macsOk = true;
			macs.forEach(mac => macsOk = macsOk && validateMac(mac))
			if(!macsOk) return cb({status: 'malformed_input'});
			
			putField(nick, 'macs', old => {
				old = old || [];
				var map = {};
				old.forEach(mac => map[mac] = true);
				macs.forEach(mac => {
					map[mac] = true;
					macIndex.link(mac, nick);
					log("Registered mac " + mac + " for player " + nick);
				});
				
				var result = [];
				for(var i in map) result.push(i);
				return result;
			}, cb);
		},
		getUserCluster: (nick, cb) => {
			if(!validateNick(nick)) return cb({status: 'invalid_nick'})
			
			var cluster = macIndex.cluster(nick);
		
			cb({status: "ok", nicks: cluster.nicks, macs: cluster.macs });
		},
		getTransmutations: (nick, cb) => {
			if(!validateNick(nick)) return cb({status: 'invalid_nick'})
			var allTrans = {};
			
			eachNickField(nick, 'transmutations', {}, (nick, trans) => {
				for(var i in trans)
						allTrans[i] = trans[i] + (allTrans[i] || 0);
			}, () => {
				cb({status: 'ok', transmutations: allTrans})
			});
		},
		increaseTransmutations: (nick, muts, cb) => {
			putField(nick, "transmutations", trans => {
				trans = trans || {};
				for(var i in muts) {
					trans[i] = muts[i] + (trans[i] || 0);
					log("Registered " + muts[i] + " transmutations with id " + i + " for player " + nick);
				}
				return trans;
			}, cb)
		},
		getBan: (nick, cb) => {
			if(!validateNick(nick)) return cb({status: 'invalid_nick'})
			var banFound = false, time = now();
			
			eachNickField(nick, 'ban', { expiresAt: 0, reason: "" }, (nick, ban) => {
				if(!banFound && ban.expiresAt >= time) {
					banFound = true;
					cb({status: 'ok', ban: { reason: ban.reason, timeLeft: ban.expiresAt - time }});
				}
			}, () => {
				if(!banFound) cb({status: 'ok', ban: { reason: "", timeLeft: 0 }});
			});
		},
		setBan: (nick, len, reason, cb) => {
			if(!validateNick(nick)) return cb({status: 'invalid_nick'})
			if(len <= 0 || !len || reason.length > maxBanReasonLength) return cb({status: 'malformed_input'})
				
			resetAllBansAt(nick, () => {
				var expires = now() + len;
				log("Setting ban for user " + nick + " for " + len + " seconds (until " + expires + ") for reason " + reason);
				putField(nick, 'ban', () => { return { expiresAt: expires, reason: reason} }, b => {
					delete b.ban.expiresAt;
					b.ban.timeLeft = len;
					cb(b);
				})
			})
		},
		resetBan: (nick, cb) => {
			if(!validateNick(nick)) return cb({status: 'invalid_nick'})
			log("Cleaning all bans for player " + nick);
			resetAllBansAt(nick, () => cb({status: 'ok'}))
		},
		getChatProps: (nick, cb) => {
			getField(nick, 'chat', {}, cb);
		},
		setChatProps: (nick, props, cb) => {
			putField(nick, 'chat', () => props, cb)
		},
		vote: (nick, id, part) => {
			
			cb({status: 'fuck_off'})
			
			/*
			if(!validateNick(nick)) return cb({status: 'invalid_nick'});
			
			uf.byNick(nick, data => {
				var result = {};
				if(!data) return cb({status: 'not_registered'});
				
				var voteData = (data.vote || )
			})
			*/
		},
		deleteVote: (nick, id) => {
			
		}
	};
	
})(userFiles, config.maxBanReasonLength);

var adminJsonApi = {
	addMacs: (params, data, cb) => userManager.addMacs(params.nick, (params.macs || '').split(/[^\dA-F\:]/), cb),
	cluster: (params, data, cb) => userManager.getUserCluster(params.nick, cb),
	transmutations: (params, data, cb) => userManager.getTransmutations(params.nick, cb),
	increaseTransmutations: (params, data, cb) => {
		var muts = {}, failed = false;
		(params.transmutations || '').split(/\|/).forEach(p => {
			var s = p.split(/:/), k = parseInt(s[0]), v = parseInt(s[1]);
			if(k in muts || v <= 0 || s <= 0 || !v || !s) failed = true;
			muts[k] = v;
		});
		
		if(failed) return cb({status: 'malformed_input'});
		
		userManager.increaseTransmutations(params.nick, muts, cb);
	},
	getBan: (params, data, cb) => userManager.getBan(params.nick, cb),
	setBan: (params, data, cb) => userManager.setBan(params.nick, parseInt(params.len), params.reason, cb),
	resetBan: (params, data, cb) => userManager.resetBan(params.nick, cb),
	setChat: (params, data, cb) => {
		var input = {};
		
		params.prefix && (input.channel = params.prefix);
		params.color && (input.channel = params.color);
		params.channel && (input.channel = params.channel);
		params.password && (input.password = params.password);
		params.blacklist && (input.blacklist = params.blacklist.split(/,/).filter(n => n.length));
		params.pm_blacklist && (input.pm_blacklist = params.pm_blacklist.split(/,/).filter(n => n.length));
		params.subscriptions && (input.subscriptions = params.subscriptions.split(/,/).filter(n => n.length));
		input.is_unlisted = ((params.is_unlisted + '') === 'true')? true: false;
		
		var invalid = false;
		var checkNick = n => { invalid = invalid || n.length > config.maxNickLength };
		var checkChannel = n => { invalid = invalid || n.length > config.maxChannelNameLength };
		var checkPassword = n => { invalid = invalid || n.length > config.maxChannelPasswordLength };
		
		(input.blacklist || []).forEach(checkNick);
		(input.pm_blacklist || []).forEach(checkNick);
		(input.subscriptions || []).forEach(s => {
			var sp = s.split(":");
			checkChannel(sp[0] || '');
			checkPassword(sp[1] || '');
		});
		checkChannel(input.channel || '');
		checkPassword(input.password || '');
		
		if(invalid || 
		(input.prefix|| '').length > config.maxPrefixLength || 
		(input.color || '').length > config.maxColorLength) {
			return cb({ status: 'malformed_input' });
		}
		userManager.setChatProps(params.nick || '', input, cb);
	},
	getChat: (params, data, cb) => userManager.getChatProps(params.nick || '', cb)
};

var jsonApi = {
	register: (params, data, cb) => userManager.register(params.nick, params.pwd, cb),
	id: (params, data, cb) => userManager.getId(params.nick, params.pwd, cb),
	nick: (params, data, cb) => userManager.getNick(params.id, cb),
	password: (params, data, cb) => userManager.changePassword(params.id, params.pwd, cb)
};

var api = {
	
};

var withRequestData = (req, body) => {
	var allData = new Buffer(0);

	req.on('data', data => allData = Buffer.concat([data, allData]));
	req.on('end', () => body(allData));
}

var processRequest = (req, res) => {

	var requestedUrl = url.parse(req.url, true);
	var functionName = ((requestedUrl.pathname.match(/\/[^\/]+\/?$/) || [])[0] || '').replace(/(^\/|\/$)/g, "")
	
	var apiFunc = api[functionName] || jsonApi[functionName] || adminJsonApi[functionName];
	var needJson = jsonApi[functionName] === apiFunc;
	
	if(!functionName){
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.write(frontpage);
		res.end();
	} else if(!apiFunc) {
		res.writeHead(200, {});
		res.end();
	} else {
		res.writeHead(200, { 'Content-Type': 'text/json' });
		withRequestData(req, data => {
	
			var params = {};
			((req.url.match(/\?(.*?)(?:#|$)/) || [])[1] || '').split('&').map(p => {
				var i = p.indexOf('=');
				if(i > 0) {
					params[p.substr(0, i)] = decodeURIComponent(p.substr(i + 1).replace(/\+/g, "%20"));
				}
			});
	
			var output = outData => {
				res.write((typeof(outData) === 'object' && !Buffer.isBuffer(outData))? JSON.stringify(outData): outData);
				res.end();
			};
			
			if(needJson) try {
				data = JSON.parse(data.toString() || '{}')
			} catch(e){
				return output({status: 'malformed_input'});
			}
			
			if(adminJsonApi[functionName] && params.key !== apiKey){
				return output({status: 'wrong_api_key'});
			}
			
			try {
				apiFunc(params, data, output);
			} catch(e){
				log(e.stack)
				return output({status: 'unknown_error'})
			}
			
			
		});
	}
}

var port = config.server.port || 80;
log("Starting the server on port " + port);

http.createServer(processRequest).listen(port);
