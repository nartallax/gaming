import * as cp from "child_process";
import * as os from "os";
import * as readline from "readline";
import {log} from "impl/log";
import {Readable, Writable} from "stream";

export abstract class CustomLib {

	protected abstract readonly libName: string;
	private _proc: cp.ChildProcess | null = null;
	protected get proc(): cp.ChildProcess {
		if(!this._proc)
			throw new Error(this.libName + " error: no process started yet.");
		return this._proc;
	}

	get isRunning(): boolean {
		return !!this._proc;
	}

	stop(){
		if(this._proc){
			this._proc.kill();
			this._proc = null;
		}
	}

	protected onProcStarted(){}

	protected get platform(): "win32" | "linux" {
		let platform = os.platform();
		if(platform !== "win32" && platform !== "linux"){
			throw new Error("Unknown platform: " + platform);
		}
		return platform;
	}

	protected launchExe(exePath: string, wineEnvVars: {readonly [k: string]: string}, args: string[] = []): Promise<string | Buffer> {

		return new Promise((ok, bad) => {
			try {
				let callback = (err: Error | null, stdout: string | Buffer, stderr: string | Buffer) => {
					if(!this._proc){
						// proc == null здесь означает, что процесс мы завершили сами и сознательно
						err = null;
					} else {
						this._proc = null;
					}
					
					if(stderr)
						log(this.libName + ": " + stderr);
					if(err)
						return bad(err);
					else
						ok(stdout);
				}

				switch(this.platform){
					case "linux": 
						this._proc = cp.execFile("wine", [exePath, ...args], {env: wineEnvVars}, callback)
						break;
					case "win32":
						this._proc = cp.execFile(exePath, args, {}, callback);
						break;
				}

				this.proc.on("error", err => {
					log(this.libName + " error: " + err)
				});

				this.proc.on("exit", (code, sig) => {
					if(!this._proc)
						return;
					if(code !== null && code !== 0){
						log(this.libName + " exited with code " + code);
					} else if(sig !== null){
						log(this.libName + " exited with signal " + sig);
					}
				});

				this.onProcStarted();

			} catch(e){ bad(e) }
		})

	}

}

export abstract class CustomStdioLib extends CustomLib {

	protected onLine(line: string){
		void line;
	}

	protected writeLine(line: string){
		(this.proc.stdin as Writable).write(line + "\n", "utf8");
	}

	protected onProcStarted(){
		let reader = readline.createInterface({
			input: this.proc.stdout as Readable,
		});
		reader.on("line", line => {
			try {
				this.onLine(line);
			} catch(e){
				log(this.libName + " line processing error: " + e);
			}
		});
		super.onProcStarted();
	}

}

// QA = question-answer mode
export abstract class CustomQALib extends CustomStdioLib {

	private waiters = [] as ((line: string) => void)[];

	protected onLine(line: string){
		if(this.waiters.length === 0){
			throw new Error("No question was asked for line \"" + line + "\".")
		}

		let [waiter] = this.waiters.splice(0, 1);
		waiter(line);

		super.onLine(line);
	}

	protected question(line: string): Promise<string>{
		return new Promise(async (ok, bad) => {
			try {
				this.waiters.push(ok);
				await this.writeLine(line);
			} catch(e){ bad(e) }
		})
	}

}