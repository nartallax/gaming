let fs = require("fs"),
	path = require("path");

let parseSkills = () => {
	let content = fs.readFileSync(path.resolve(__dirname, "../tmp/skills.txt"), "utf8");

	let knownSkills = {};
	content.split("\n").forEach(x => {
		let [id, name] = x.split("\t");
		if(parseInt(id) + "" !== id)
			return;
		if(!(name in knownSkills)){
			knownSkills[name] = [];
		}
		knownSkills[name].push(parseInt(id));
	});

	console.log("{");
	Object.keys(knownSkills).forEach(name => {
		let ids = [...new Set(knownSkills[name])];
		console.log("\"" + name + "\": " + JSON.stringify(ids) + ",")
	})
	console.log("}");
}

let parseItems = () => {
	let content = fs.readFileSync(path.resolve(__dirname, "../tmp/items.txt"), "utf8");
	
	let known = {};
	content.split("\n").forEach(x => {
		let [rawId, name, postfix] = x.split('\t');
		let id = parseInt(rawId);
		if(id + "" !== rawId)
			return;
		let fullName = name + (postfix? " " + postfix: "");
		(known[fullName] = (known[fullName] || [])).push(id);
	});
	
	console.log("{");
	Object.keys(known).forEach(name => {
		let ids = [...new Set(known[name])];
		console.log("\"" + name + "\": " + JSON.stringify(ids) + ",")
	})
	console.log("}");
}

parseItems();