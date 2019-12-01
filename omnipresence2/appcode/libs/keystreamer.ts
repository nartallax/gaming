import {CustomStdioLib} from "./custom_lib";
import {WinapiConstant} from "./winapi_constants";

const exePath = "./keystreamer/keystreamer.exe";

export class Keystreamer extends CustomStdioLib {
	protected readonly libName = "Keystreamer";

	start(wineEnvVars: {readonly [k: string]: string}, winId: number){
		this.launchExe(exePath, wineEnvVars, [winId + ""]);
	}

	private zeroPad(num: number): string {
		let res = num + "";
		while(res.length < 6)
			res = "0" + res;
		return res;
	}

	sendKey(vk: number, down: boolean){
		this.writeLine("k" + this.zeroPad(vk) + (down? "1": "0"));
	}

	sendKeyPress(vk: number){
		this.sendKey(vk, true);
		this.sendKey(vk, false);
	}

	sendChar(char: string){
		this.writeLine("c" + this.zeroPad(char.charCodeAt(0)));
	}

	/** отсылает строку с произвольными клавишами в окно
	 * вид строки: {enter down}{enter up}/unstuck{enter}
	 * все, что внутри {}, воспринимается как нажатие специальной клавиши
	 * если down/up не указан - сначала шлется down, затем сразу же up
	 * все, что не внутри {}, воспринимается как прямо символы, которые нужно написать
	 * список имен клавиш - в WinapiConstant.vk
	 */
	sendKeyString(str: string){
		let parts = str.match(/(?:\{[a-z\d\s]+\}|[^{}]+)/g) as string[];
		parts.forEach(part => {
			if(part.startsWith('{')){
				var subparts = part.substring(1, part.length - 1).split(' ').filter(x => x)
				let vk = WinapiConstant.vk[subparts[0]]
				let down = subparts[1] === 'down'? true: subparts[1] === 'up'? false: null;
				down === null? this.sendKeyPress(vk): this.sendKey(vk, down);
			} else {
				for(var i = 0; i < part.length; i++){
					this.sendChar(part.charAt(i));
				}
			}
		})
	}

	bringToFront(){
		this.writeLine("b");
	}
}