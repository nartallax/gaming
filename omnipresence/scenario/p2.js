pkg('scenario.p2', () => {
 
	var log = pkg('util.log'),
		Utils = pkg('op.utils'),
		CLI = pkg('op.cli'),
		defaultCLI = pkg("op.cli.default"),
		defaultHotkeys = pkg("op.hotkeys.default");
		
	return () => {
		Utils.start([
			['p2tank', 'main'], 
			['p2se1', 'mundane'], 
			['p2pp1', 'mundane'], ['p2ee1', 'mundane'],
			['p2nuker1', 'secondary'], ['p2nuker2', 'secondary'], 
			//['p2nuker3', 'secondary'], ['p2nuker4', 'secondary']
			
			['p2nuker3', 'lesser'], ['p2nuker4', 'lesser'], ['p2nuker5', 'lesser'], ['p2nuker6', 'lesser'], ['p2nuker7', 'lesser'],
			
			['p2nuker8', 'old'], ['p2nuker9', 'old'], ['p2nuker10', 'old'], ['p2nuker11', 'old'], ['p2nuker12', 'old']
		], (u, cls) => {
			
			let partyLayout = {
				"Panzer": ["Jovovich", "BOMBANYLO", "ULTRAKILL", "RagefulZero", "ZorgZorg", "NISHTYAK", "Tworeest"],
				"KratosGirl": ["Platinum", "ItsOver9000", "BromButan", "RmRf", "Narimanchik", "Vduvatel", "Spoon"],
			};
			
			if(cls.length <= 9 && !!cls.find(x => x.char.name === "Panzer")){
				partyLayout = {"Panzer": cls.map(x => x.char.name).filter(x => x !== "Panzer")}
			}
			
			let partyNukerIndex = 0;
			let partyNukers = Object.keys(partyLayout).map(k => partyLayout[k]).map(chars => {
				return chars.map(x => u.byNick(x)).filter(x => x && !!x.char.roles.find(x => x === "nuker"))
			}).filter(x => x.length);
			let nextPartyNukers = () => partyNukers[partyNukerIndex = ((partyNukerIndex + 1) % partyNukers.length)] || [];
			
			u	.getPartyLeader().setHotkeys(defaultHotkeys(u, {
					'`':	() => u.getRoundRobinClient('nuker').useHotkey(1),
					"f1":	() => nextPartyNukers().forEach(x => x.useHotkey(1)),
					"shift+f1":() => u.byRole('nuker').forEach(x => x.useHotkey(4)),
					"f4":	() => u.byRole('nuker').forEach(x => x.useHotkey(3))
				})).bringToFront(() => log("Done logging."));
			
			var cli = new CLI(defaultCLI(u, cls, {
				meleeBuffHotkey: 8,
				mageBuffHotkey: 7,
				partyLayout: partyLayout
			}));
		});
		
	}
	
});