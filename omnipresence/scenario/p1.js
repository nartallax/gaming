pkg('scenario.p1', () => {

	var Client = pkg('op.clients'),
		log = pkg('util.log'),
		Utils = pkg('op.utils'),
		CLI = pkg('op.cli');
		
	return () => {
		Utils.start([
			['p1tank', 'main'], 
			['p1se1', 'mundane'], ['p1se2', 'mundane'], 
			'p1nuker5', 'p1nuker6',
			['p1nuker1', 'lesser'], ['p1nuker2', 'lesser'], ['p1nuker3', 'lesser'], ['p1nuker4', 'lesser']
		], (u, cls) => {
			u	.defineRoundRobin('nuker', u.byRole('nuker'))
				.defineRoundRobin('healer', u.byRole('healer'))
				.defineRoundRobin('buffer', u.byRole('buffer'))
				.getPartyLeader().setHotkeys({
					'`':	() => u.getRoundRobinClient('nuker').useHotkey(1), // single - common nuke cast
					'f1':	() => u.byRole('nuker').forEach(x => x.useHotkey(1)), // everyone - common nuke cast
					'f2':	() => u.getTwinks().forEach(x => x.useHotkey(2)),		// everyone - follow
					'f3':	() => u.getRoundRobinClient('healer').useHotkey(1),	// single - master heal
					'f4':	() => u.byRole('nuker').forEach(x => x.useHotkey(3)),	// everyone - powerful cast
					'f5':	() => u.getRoundRobinClient('healer').useHotkey(3), // single - assist heal
					'f6':	() => u.getRoundRobinClient('healer').useHotkey(7), // mage buff by assist
					'f7':	() => u.getRoundRobinClient('healer').useHotkey(8), // melee buff by assist
					'f8':	() => {
						// nothing yet. refill will be unlocked later
					},
					'f9':	() => u.formParty(),
					'f10':	() => {
						u.getTwinks().forEach(x => x.cancelCurrentAction()),
						Client.activateAll(),
						u.chatAll("#Nya!");
					},
					'f11':	() => u.byRole('nuker').forEach(cl => cl.useHotkey(11)),
					'f12':	() => u.byRole('nuker').forEach(x => x.useHotkey(12)), // soulshots
				}).bringToFront(() => {
					u.chatAll("#Started and working.");
					setTimeout(() => u.formParty(), 1000);
				});
			
			var cli = new CLI({
				'rlg': 	() => u.reloginAllDead(),
				'ass':	() => u.getTwinks().forEach(cl => cl.assist()),
				'atk':	() => u.getTwinks().forEach(cl => cl.attack()),
				'act':	() => Client.activateAll(),
				'eval':	() => cls.forEach(cl => cl.evaluate()),
				'tp':	() => cls.forEach(cl => cl.unstuck()),
				'act':	() => Client.activateAll(),
				'say':	word => u.chatAll('#' + (word || 'Nya!'))
			});
		});
		
	}
	
});