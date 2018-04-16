pkg('scenario.p1', () => {

	var Client = pkg('op.clients'),
		log = pkg('util.log'),
		Utils = pkg('op.utils'),
		CLI = pkg('op.cli'),
		defaultCLI = pkg("op.cli.default"),
		defaultHotkeys = pkg("op.hotkeys.default");
		
	return () => {
		Utils.start([
			['p1tank', 'main'], 
			//['p1se1', 'mundane'], ['p1pp1', 'mundane'], 
			'p1se1', 'p1pp1', 
			//'p1nuker1', 'p1nuker2', 
			
			//['p1nuker3', 'lesser'], ['p1nuker4', 'lesser'], ['p1nuker5', 'lesser'], ['p1nuker6', 'lesser']
		], (u, cls) => {
			
			u	.getPartyLeader().setHotkeys(defaultHotkeys(u, {
				/*
					'`':	() => u.getRoundRobinClient('nuker').useHotkey(1), // single - common nuke cast
					'f1':	() => u.byRole('nuker').forEach(x => x.useHotkey(1)), // everyone - common nuke cast
					'f4':	() => u.byRole('nuker').forEach(x => x.useHotkey(3))	// everyone - powerful cast
					*/
				})).bringToFront(() => log("Done logging."));
			
			var cli = new CLI(defaultCLI(u, cls, {
				meleeBuffHotkey: 8,
				mageBuffHotkey: 7
			}));
		});
		
	}
	
});