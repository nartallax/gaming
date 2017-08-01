pkg('scenario.p1', () => {

	var Client = pkg('op.client'),
		log = pkg('util.log'),
		Utils = pkg('op.utils'),
		CLI = pkg('op.cli');
		
	return () => {
		Utils.startMany([
		/*
			['p1tank', 'main'], 
			['p1se1', 'mundane'], ['p1se2', 'mundane'], 
			'p1nuker1', 'p1nuker2', 'p1nuker3', 'p1nuker4', 'p1nuker5', 'p1nuker6'
			*/
		], u => {
			/*
			u	.defineRoundRobin('nuker', u.byRole('nuker'))
				.defineRoundRobin('healer', u.byRole('healer'))
				.defineRoundRobin('buffer', u.byRole('buffer'))
				.getPartyLeader().setHotkeys({
					'`': 	() => u.byRole('nuker').forEach(x => x.useHotkey(1)), // everyone - common nuke cast
					'f1':	() => u.getRoundRobinClient('nuker').useHotkey(1),	// single - common nuke cast
					'f2':	() => u.getTwinks().forEach(x => x.useHotkey(2)),		// everyone - follow
					'f3':	() => u.getRoundRobinClient('healer').useHotkey(1),	// single - heal
					'f4':	() => u.byRole('nuker').forEach(x => x.useHotkey(3)),	// everyone - powerful cast
					'f7':	() => u.byRole('nuker').forEach(x => x.useHotkey(12)),
					'f8':	() => { // common on-run maintenance
						u.reloginAllDead(() => {
							Client.activateAll();
							u.getTwinks().forEach(x => x.cancelCurrentAction());
							u.chatAll("#Nya!");
						});
					},
					'f9':	() => u.formParty(),
					'f10':	{ handler: () => u.getTwinks().forEach(cl => cl.useHotkey(10)), noPrevent: true}, // unstuck
					'f11':	{ handler: () => u.getTwinks().forEach(cl => cl.useHotkey(11)), noPrevent: true}, // sitstand
					'f12':	() => u.getTwinks().forEach(x => x.evaluate())
				}).bringToFront(() => {
					u.chatAll("#Started and working.")
					//setTimeout(() => u.formParty(), 1000);
				});
				*/
				
			var cli = new CLI({
				'relog': 	() => u.reloginAllDead(),
				'close': 	() => cli.shutdown(),
				'exit': 	() => process.exit(0)
			});
		});
	}
	
});