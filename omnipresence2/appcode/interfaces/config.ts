/** Конфигурация хоста, на котором будут запущен инстанс этой программы */
export interface HostDefinition {
	readonly hostname: string;
	readonly ip?: string; // если не указано, будет взято значение из hostname в качестве ip
	readonly name?: string; // если не указано, будет взято значение из hostname в качестве имени хоста
	readonly isMaster?: boolean;
	readonly wineEnvVars?: { readonly [k: string]: string};
	readonly envVars?: { readonly [k: string]: string};
}

export type GameClientDefinition = (OriginalGameClientDefinition | CustomGameClientDefinition) & {
	readonly name: string;
	readonly host: string;
}

export interface CustomGameClientDefinition {
	readonly name: string;
	readonly host: string;
	readonly token: string;
	readonly protocol: number;
	readonly authHost: string;
	readonly authPort: number;
	readonly serverId: number;
}

/** Конфигурация клиента игры, с которым этой программе можно будет взаимодействовать */
export interface OriginalGameClientDefinition {
	/** Путь до L2.exe */
	readonly path: string;
	/** Имя данного клиента. Нужно для того, чтобы выбирать разные клиенты для запуска */
	readonly name: string;
	/** на каком хосте расположена конфигурация клиента. если не указано - значит, на мастере */
	readonly host: string;
	
	readonly env?: { readonly [key: string]: string }
	readonly runner?: string;
	readonly cliArgs?: ReadonlyArray<string>;
	readonly simpleGraph?: boolean;
	readonly affinity?: ReadonlyArray<number>;
	readonly acquiredCores?: number;
	readonly afterStart?: ReadonlyArray<{readonly command: string, readonly args?: ReadonlyArray<string> }>;
}

/** Конфигурация аккаунта, с которым этой программе можно будет взаимодействовать
 * Программа подразумевает, что 1 аккаунт = 1 персонаж
 */
export interface AccountDefinition {
	readonly login: string;
	readonly password: string;
	readonly nickname: string;
	readonly profession?: string;
}

/** Некие константы, привязанные к данному конкретному инстансу, которые не хотелось хардкодить в коде */
export interface ConstantsDefinition {
	readonly netPort: number;
}

/** Все конфигурационные определения в сборе */
export interface DefinitionBundle {
	readonly hosts: ReadonlyArray<HostDefinition>;
	readonly clients: ReadonlyArray<GameClientDefinition>;
	readonly accounts: ReadonlyArray<AccountDefinition>;
	readonly constants: ConstantsDefinition;
}