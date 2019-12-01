//console.log(
//require("os").platform()
//require("ref")
//)

let cp = require("child_process");

//require("child_process").spawn("wine", ["/home/nartallax/game/L2/system/L2.exe"], {env:{"WINEPREFIX":"/home/nartallax/.winela2_64"}})
//require("child_process").spawn("Z:\\home\\nartallax\\game\\L2\\system\\L2.exe", {env:{"WINEPREFIX":"/home/nartallax/.winela2_64"}})
//require("child_process").spawn("/home/nartallax/game/L2/system/L2.exe", {shell: true, detached: true})

//cp.execFile("cmd", ["/c", "test_runner.bat"])
cp.exec("node", ["--version"])

/*
let proc = cp.spawn("cmd", ["/c", "test_runner.bat"])
proc.stdin.destroy();
proc.stdout.destroy();
proc.stderr.destroy();
//proc.stderr.on("data", data => console.log(data.toString("utf8")))
*/
setInterval(() => {}, 1000000);
