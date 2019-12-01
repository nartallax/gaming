import {CommandBus} from "impl/command_bus";
import {ScenarioImpl} from "scenario";
import {config} from "impl/config";
import {NetworkNode} from "impl/network/node";
import {NetworkSlaveNode} from "impl/network/node_slave";
import {log} from "impl/log";
import {LocalHost} from "impl/host/host_local";
import {RemoteHost} from "impl/host/host_remote";
import {NetworkMasterNode} from "impl/network/node_master";
import {ScenarioUtils} from "impl/scenario_utils";
import {Character} from "impl/character";


export async function run(){
	if(NetworkNode.isMaster(config)){
		await runMaster();
	} else {
		await runSlave();
	}
}

async function runMaster(){
	log("Running as master.")
	let scenario = new ScenarioImpl([...process.argv].slice(2));
	let commandBus = new CommandBus();
	let node = new NetworkMasterNode(config);
	
	let hostNames = new Set<string>(scenario.characters.map(_ => config.client(_.client).host || config.localHostname));
	let hosts = [...hostNames].map(name => {
		if(name === config.localHostname){
			return new LocalHost(config, name, commandBus);
		} else {
			return new RemoteHost(config, name, commandBus, node);
		}
	});
	hosts.forEach(host => commandBus.registerHost(host));

	await node.start();

	let charsByHost = new Map<string, {nick: string, client: string}[]>();
	scenario.characters
		.map(_ => [config.client(_.client).host || config.localHostname, _] as [string, {nick: string, client: string}])
		.forEach(p => {
			if(!charsByHost.has(p[0]))
				charsByHost.set(p[0], []);
			(charsByHost.get(p[0]) as {nick: string, client: string}[]).push(p[1]);
		});
	

	await Promise.all(hosts.map(async host => {
		if(host instanceof RemoteHost){
			await host.syncConfig();
		}

		//console.log("HOST: " + host.name, charsByHost.get(host.name));
		await commandBus.runHostAction(host.name, {
			type: "setChars",
			chars: (charsByHost.get(host.name) || charsByHost.get(host.definition.hostname)) as {nick: string, client: string}[]
		});
		await commandBus.runHostAction(host.name, { type: "launch" })
	}))
	
	scenario.action(new ScenarioUtils(
		scenario.characters.map(p => new Character(config, p.nick, p.client, commandBus)),
		commandBus
	));
}

async function runSlave(){
	log("Running as slave.")
	let commandBus = new CommandBus();
	commandBus.registerHost(new LocalHost(config, config.localHostname, commandBus));
	let node = new NetworkSlaveNode(config, commandBus);
	node.start();
}