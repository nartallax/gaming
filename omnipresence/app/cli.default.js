pkg("op.cli.default", () => {

	let log = pkg("util.log");

	return (u, cls, params) => {
		return {
			"relog": 	() => u.reloginAllDead(),
			"rlg": 		() => u.reloginAllDead(),
			
			"assist":	() => u.getTwinks().forEach(cl => cl.assist()),
			"ass":		() => u.getTwinks().forEach(cl => cl.assist()),
			
			"attack":	() => u.getTwinks().forEach(cl => cl.attack()),
			"atk":		() => u.getTwinks().forEach(cl => cl.attack()),
			
			"astk":	() => {
				u.getTwinks().forEach(cl => cl.assist());
				setTimeout(() => {
					u.getTwinks().forEach(cl => cl.attack());
				}, 500);
			},
			
			"evaluate":	() => u.getTwinks().forEach(cl => cl.evaluate()),
			"eval":		() => u.getTwinks().forEach(cl => cl.evaluate()),
			
			"unstuck":	() => cls.forEach(cl => cl.unstuck()),
			"tp":		() => cls.forEach(cl => cl.unstuck()),
			
			"activate":	() => Client.activateAll(),
			
			"chat":		word => u.chatAll('#' + (word || 'Nya!')),
			"party": 	() => u.formParty(params.partyLayout),
			"buff": 	() => u.buffAll(params.meleeBuffHotkey, params.mageBuffHotkey, params.buffTiming, () => log("Buffed.")),
			
			"hk":		hk => u.getTwinks().forEach(cl => cl.useHotkey(parseInt(hk)))
		}
	}

});