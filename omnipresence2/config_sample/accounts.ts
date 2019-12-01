import {AccountDefinition} from "interfaces/config";

/** Здесь мы перечисляем аккаунты, которые будут доступны программе
 * Программа подразумевает, что 1 аккаунт = 1 персонаж. Выбирать из нескольких персонажей на одном аккаунте не умеет.
 */
export const accountsConfig: AccountDefinition[] = [
	{
		login: "eto_login",
		password: "eto_parol",
		nickname: "Pepyaka",
		profession: "bladedancer"
	}
]