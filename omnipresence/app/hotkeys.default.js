pkg("op.hotkeys.default", () => {
	
	let Client = pkg("op.clients"),
		log = pkg("util.log");
	
	let healMostInjured = u => {
		u.getMostInjuredAlive((client, state) => {
			log("Healing most injured: " + client.char.name + " with " + ((~~(state.hp * 10000)) / 100) + "% hp.");
			let healer = u.getRoundRobinClient("healer");
			healer.target(client.char.name);
			setTimeout(() => healer.useHotkey(1), 500);
		});
	}
	
	let maintenance = u => {
		Client.activateAll();
		u.getTwinks().forEach(x => x.cancelCurrentAction());
		u.unchatAll();
	}
	
	let masterCheckerHandle = null;
	let toggleHealRecharge = u => {
		if(masterCheckerHandle){
			clearInterval(masterCheckerHandle);
			masterCheckerHandle = null;
			log("Disabled auto master heal+recharge.");
		} else {
			let master = u.getPartyLeader();
			if(!master){
				log("Could not autoheal+recharge: no master client found.");
				return;
			}
			
			log("Enabled auto master heal+recharge.");
			let canRecharge = u.hasRoundRobin("recharger");
			
			let healRR = null;
			if(!u.hasRoundRobin("healer_not_recharger")){
				u.defineRoundRobin("healer_not_recharger", u.byRole("healer").filter(x => !x.char.roles.find(x => x === "recharger")));
				if(u.hasRoundRobin("healer_not_recharger")){
					healRR = "healer_not_recharger";
				} else if(u.hasRoundRobin("healer")){
					healRR = "healer";
				}
			}
			
			masterCheckerHandle = setInterval(() => {
				master.getBarState(state => {
					if(healRR && state.hp < 0.7){
						log("Master has " + (~~(state.hp * 10000) / 100) + "% HP, healing.");
						u.getRoundRobinClient(healRR).useHotkey(5);
					}
					if(canRecharge && state.mp < 0.5){
						log("Master has " + (~~(state.mp * 10000) / 100) + "% MP, recharging.");
						u.getRoundRobinClient("recharger").useHotkey(4);
					}
				});
			}, 1250);
		}
	}
	
	return (u, otherHotkeys) => {
		return Object.assign({
			"shift+escape":	() => maintenance(u),
			"f2":	() => u.getTwinks().forEach(x => x.useHotkey(2)),
			"f3":	() => healMostInjured(u),
			"f5":	() => u.getRoundRobinClient('healer').useHotkey(3),
			"f6":	() => u.getRoundRobinClient('recharger').useHotkey(4),
			"shift+f6":() => toggleHealRecharge(u),
			"f10":	() => u.buffAll(8, 7),
			"f11":	() => {
				u.byRole("nuker").forEach(x => x.useHotkey(11))
			},
			"f12":	() => {
				[].concat(u.byRole("healer"), u.byRole("ballast")).forEach(x => x.useHotkey(11))
			},
		}, otherHotkeys)
	}
	
});