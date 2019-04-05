let fs = require("fs"),
	path = require("path");

let content = fs.readFileSync(path.resolve(__dirname, "../tmp/skills.txt"), "utf8");

let knownSkills = {};
content.split("\n").forEach(x => {
	let [id, name] = x.split("\t");
	if(parseInt(id) + "" !== id)
		return;
	if(!(name in knownSkills)){
		knownSkills[name] = [];
	}
	knownSkills[name].push(id);
});

console.log("{");
Object.keys(knownSkills).forEach(name => {
	let ids = [...new Set(knownSkills[name])];
	console.log("\"" + name + "\": " + JSON.stringify(ids) + ",")
})

console.log("}");