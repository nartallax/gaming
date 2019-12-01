import {GameClientDefinition} from "interfaces/config";

/** Здесь мы указываем, где на каком хосте лежат какие клиенты и как их запускать */
export const clientsConfig: GameClientDefinition[] = [
	{ 
		name: "main",
		host: "nartallax-laptop",
		path: "/home/nartallax/game/L2/system/L2.exe",
		env: {
			"WINEARCH": "win32",
			"WINEPREFIX": "/home/nartallax/.winela2"
		},
		runner: "wine"
	}
]