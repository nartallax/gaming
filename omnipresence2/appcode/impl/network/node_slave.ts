import {NetworkNode, CommandMessage, ConfirmationMessage} from "./node";
import * as net from "net";
import {CommandBus, Command, CharacterCommand, HostCommand} from "interfaces/command";
import {DefinitionBundle} from "interfaces/config";
import {receiveJsonMessages, sendJsonMessage} from "./binary_protocol";
import {log} from "impl/log";

/** Класс, позволяющий принимать сообщения по сети */
export class NetworkSlaveNode extends NetworkNode {
	private readonly commandBus: CommandBus;
	private server: net.Server | null = null;
	private masterConnection: net.Socket | null = null;

	constructor(config: DefinitionBundle, commandBus: CommandBus){
		super(config);
		this.commandBus = commandBus;
	}

	start(): Promise<void> {
		return new Promise((ok, bad) => {
			try {
				this.server = net.createServer(socket => this.handleMasterConnected(socket))
				this.server.listen(this.port, () => {
					log("Listening on port " + this.port)
					ok();
				})
			} catch(e){ bad(e) }
		})
	}

	private handleMasterConnected(socket: net.Socket){
		this.masterConnection = socket;
		log("Master connected.");

		socket.on('close',() => {
			log("Master disconnected.");
			this.masterConnection = null;
			this.commandBus.runHostAction(this.host.name || this.host.hostname, {type: "shutdownClients"})
		});

		receiveJsonMessages(socket, message => this.handleMessage(message));
	}

	private async sendMessage(message: ConfirmationMessage){
		if(!this.masterConnection){
			log("Could not send confirmation message #" + message.id + ": master not connected.")
		} else {
			sendJsonMessage(this.masterConnection, message);
		}
	}

	private async handleMessage(message: CommandMessage){
		try {
			this.sendMessage({
				id: message.id,
				success: await this.carryCommandToBus(message.command)
			})
		} catch(e){
			log(e.stack);
			try {
				this.sendMessage({
					id: message.id,
					success: false
				})
			} catch(e){
				log(e.stack);
			}
		}
	}

	private carryCommandToBus(command: Command): Promise<boolean>{
		let charCommand = command as CharacterCommand;
		if(charCommand.nick){
			return this.commandBus.runCharacterAction(charCommand.nick, charCommand.action);
		} else {
			let hostCommand = command as HostCommand;
			return this.commandBus.runHostAction(hostCommand.name, hostCommand.action);
		}
	}
}