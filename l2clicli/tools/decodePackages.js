/*
	Тул по декодированию ранее собранных wireshark-ом пакетов и экспортированных в JSON
*/

class PackageChipper {
	constructor(){
		this.bytes = "";
	}
	
	append(bytes){
		this.bytes += bytes;
	}
	
	tryChip(){
		if(this.bytes.length < 4)
			return null;
		
		
		let l = parseInt(this.bytes[0] + this.bytes[1], 16) | (parseInt(this.bytes[2] + this.bytes[3], 16) << 8);
		if(this.bytes.length < l * 2)
			return null;
		
		let pkgBytes = this.bytes.substring(4, l * 2);
		this.bytes = this.bytes.substring(l * 2);
		return pkgBytes;
	}
}

(async () => {
	try {
		let fs = require("fs"),
			cp = require("child_process"),
			path = require("path");

		if(process.argv.length < 3)
			throw new Error("Expected package file as first argument.");
		let pkgExportFile = process.argv[2];

		if(process.argv.length < 4)
			throw new Error("Expected token as second argument.");
		let token = process.argv[3];

		let pkgs = JSON.parse(fs.readFileSync(pkgExportFile, "utf8"));
		
		let onLineFromProc = null;
		
		let proc = cp.spawn(path.resolve(__dirname, "../l2clicli"), ["--dump-mode", "--token", token], {
			stdio:["pipe","pipe","pipe"],
			terminal: true
		});
		proc.stdout.on("data", d => {
			console.log(d.toString("utf8").replace(/\n$/, ""));
			onLineFromProc && onLineFromProc();
		});
		proc.stderr.on("data", d => {
			console.log("STDERR: " + d.toString("utf8"));
		});
		proc.on("error", e => console.log(e))
		proc.on("exit", (code, signal) => console.log("Process exited with " + (signal? "signal " + signal: "code " + code)));

		let outChipper = new PackageChipper(), inChipper = new PackageChipper();
		for(let x of pkgs){
			let isOut = x._source.layers.ip["ip.src"].startsWith("192");
			
			let pkgStrs = [];
			
			if(x._source.layers.tcp["tcp.flags_tree"]["tcp.flags.fin"] === "1"){
				pkgStrs.push("F");
			} else if(x._source.layers.data){
				let pkgData = x._source.layers.data["data.data"].replace(/:/g, "");
				(isOut? outChipper: inChipper).append(pkgData);
			}
			
			while(true){
				let pkg = outChipper.tryChip();
				if(!pkg)
					break;
				pkgStrs.push(">" + pkg);
			}
			
			while(true){
				let pkg = inChipper.tryChip();
				if(!pkg)
					break;
				pkgStrs.push("<" + pkg);
			}
			
			for(pkgStr of pkgStrs){
				//console.log("WRITING " + pkgStr);
				await Promise.all([
					new Promise(ok => proc.stdin.write(pkgStr + "\n", "utf8", ok)),
					new Promise(ok => { onLineFromProc = ok }),
				]);
			}
		}
		
		setTimeout(() => {}, 1000);
		
	} catch(e){
		console.error(e);
		process.exit(1);
	}
})();