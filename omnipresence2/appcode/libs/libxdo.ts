import * as ref from "ref";

/** Тут - обертки для хоть сколько-нибудь вменяемого взаимодействия с libxdo
* У меня были смутные надежды, что автор npm-пакета libxdo их предоставит, но нет. */
export const pInt = ref.refType("int");
export const ppInt = ref.refType(pInt);


//export type XdoWindow = number;

export class Libxdo {

	private lib: any;
	private instance: any;

	init(){
		if(!this.lib){
			this.lib = require("libxdo");
			this.instance = this.lib.xdo_new(null);
			if(this.instance === null)
				throw new Error("Failed to initialize libxdo.");
		}
	}
/*
	winByPid(pid: number): XdoWindow[] {
		let s = new struct_xdo_search_t({pid, })
	}
*/
}

export const libxdo = new Libxdo();

