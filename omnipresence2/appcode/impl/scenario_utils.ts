import {Character} from "./character";
import * as readline from "readline";
import {log} from "./log";
import {CommandBus} from "interfaces/command";
import {LaunchAction} from "interfaces/action";
import {sleep} from "./sleep";
import * as os from "os";

/** В этом классе содержатся разнообразные небольшие функции, делающие написание сценариев проще и приятнее
 * Также используется как контейнер для множества character-ов
 */
export class ScenarioUtils {

	readonly characters: ReadonlyArray<Character>;
	private readonly cbus: CommandBus;

	get localHostname(): string {
		return os.hostname();
	}

	constructor(chars: ReadonlyArray<Character>, commandBus: CommandBus){
		this.characters = chars;
		this.cbus = commandBus;
	}

	delayAfterCommand = 250;
	async seq(char: Character | Character[] | RoundRobin<Character>, ...cmds: ((char: Character) => Promise<any>)[]){
		let chars = [] as Character[];
		if(Array.isArray(char)){
			chars = char;
		} else if(char instanceof Character){
			chars = [char];
		} else {
			char.next(_ => chars = [_])
		};

		await Promise.all(chars.map(async _ => {
			for(let i = 0; i < cmds.length; i++){
				await cmds[i](_);
				if(i < cmds.length - 1){
					await sleep(this.delayAfterCommand);
				}
			}
		}))
	}

	cli(handlers: { readonly [k: string]: (args: string[]) => void}){
		let reader = readline.createInterface({
			input: process.stdin,
		});
		reader.on("line", line => {
			let parts = line.split(" ").map(_ => _.trim()).filter(_ => !!_);
			let cmd = parts[0];
			let args = parts.slice(1);
			if(cmd in handlers){
				handlers[cmd](args);
			} else {
				log("Unknown command: \"" + cmd + "\"")
			}
		});
	}
	
	async relog(){
		this.cbus.hosts.forEach(host => {
			this.cbus.runHostAction(host.name, {type: "launch"} as LaunchAction)
		})
	}

	roundRobin<V>(chars: V[]): RoundRobin<V> {
		let i = 0;
		return {
			next:<T>(actionOrCount: number | ((char: V) => T | Promise<T>)) => {
				if(typeof(actionOrCount) === "number"){
					if(actionOrCount > chars.length){
						return chars;
					}
					let result = [] as V[];
					for(let x = 0; x < actionOrCount; x++){
						result.push(chars[i]);
						i = (i + 1) % chars.length;
					}
					return result;
				} else {
					let action = actionOrCount as (char: V) => T | Promise<T>;
					return new Promise(async (ok, bad) => {
						try {
							if(chars.length < 1)
								return ok();
							let char = chars[i];
							i = (i + 1) % chars.length;
							let res = await Promise.resolve(action(char));
							ok(res);
						} catch(e){ bad(e)}
					});
				}
			}
		} as RoundRobin<V>;
	}
}

export interface RoundRobin<V> {
	next<T>(action: (char: V) => T | Promise<T>): Promise<T | null>;
	next(count: number): V[];
}