import {HostAction, CharacterAction} from "./action";
import {HostDefinition, GameClientDefinition, AccountDefinition} from "./config";

export type Command = HostCommand | CharacterCommand;

/** Команда, обращенная к какому-либо конкретному хосту */
export interface HostCommand {
	/** имя хоста, к которому команда обращена */
	name: string;
	/** действие, которое нужно сделать этому хосту */
	action: HostAction;
}

/** Команда, обращенная к конкретному клиенту */
export interface CharacterCommand {
	/** имя персонажа, к которому обращена команда */
	nick: string;
	/** действие, которое надлежит сделать персонажу */
	action: CharacterAction;
}

/** Некий хост, который может получать команды. Обычно сводится либо к текущему, либо удаленному */
export interface Host {
	readonly name: string;
	readonly definition: HostDefinition;
	/** множество персонажей, залогиненных на данном хосте.
	 * их список не должен меняться после добавления хоста в CommandBus. при изменении хост следует передобавить */
	readonly clients: ReadonlyArray<GameClient>;

	spawnClient(client: string, nickname: string): void;
	runAction(action: HostAction): Promise<boolean>;
}

/** Запущенный клиент, в который залогинен конкретный персонаж. Нужен для того, чтобы исполнять команды. */
export interface GameClient {
	readonly client: GameClientDefinition;
	readonly account: AccountDefinition;
	runAction(action: CharacterAction): Promise<boolean>;
}

/** Шина команд. Получает команду откуда бы то ни было, выбирает нужный способ исполнить её и исполняет */
export interface CommandBus {
	readonly hosts: ReadonlyArray<Host>;

	registerHost(host: Host): void;
	runHostAction(host: string, action: HostAction): Promise<boolean>;
	runCharacterAction(nick: string, action: CharacterAction): Promise<boolean>;
}