pkg('scenario.p1', () => {

	var Client = pkg('op.client'),
		Window = pkg('win.window'),
		log = pkg('util.log'),
		winapi = pkg('win.api'),
		config = pkg('config')
		
	return () => {
		
		Client.startMany([['p1tank', 'main'], ['p1se', 'mundane'], ['p1bd', 'mundane'], 'p1nuker1', 'p1nuker2', 'p1nuker3', 'p1nuker4', 'p1nuker5', 'p1nuker6'], clients => {
			log('started!');
			
			var head = clients.filter(x => x.char.roles.filter(x => x === 'tank').length > 0)[0],
				supports = clients.filter(x => x.char.roles.filter(x => x === 'buffer').length > 0),
				nukers = clients.filter(x => x.char.roles.filter(x => x === 'nuker').length > 0),
				notHead = clients.filter(x => x !== head);
			
			var goParty = cb => {
				head.partyWithMany(notHead, () => {
					head.bringToFront(() => {
						notHead.forEach(x => x.chat('#ready'))
						cb();
					})
				})
			}
			
			goParty(() => {
				var nukerRoundRobin = 0;
					
				head.onKey(k => {
					switch(k.vk){
						case 192: // ~
							notHead.forEach(x => x.chat('#ready'));
							break;
						case 49: // 1
							var nuker = nukers[nukerRoundRobin = (nukerRoundRobin + 1) % nukers.length];
							nuker.useHotkey(1);
							break;
						case 50: // 2
							notHead.forEach(cl => cl.useHotkey(2));
							break;
						case 51: // 3
							nukers.forEach(cl => cl.useHotkey(1));
							break;
						case 48: // 0
							notHead.forEach(cl => cl.useHotkey(10));
							break;
						case 189: // -
							notHead.forEach(cl => cl.useHotkey(11));
							break;
						case 187: // =
							notHead.forEach(x => {
								x.target(head.char.name);
								x.evaluate();
							})
							break;
						case 220: // |
							goParty(() => log('Repartied.'));
							break;
					}
				});
			});
		});
	}
	
});