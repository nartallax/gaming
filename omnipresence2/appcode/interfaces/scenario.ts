import {ScenarioUtils} from "impl/scenario_utils";

/** Сценарий - конкретное описание того, какие персонажи должны что делать */
export interface Scenario {
	/** Персонажи, участвующие в сценарии */
	readonly characters: {nick: string, client: string}[];

	/** Начало действия. Вызывается в момент, когда все персонажи залогинены */
	action(utils: ScenarioUtils): void;
}