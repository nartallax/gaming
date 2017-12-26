package nartallax.minecraft.transmutation

object RecipeBook {

    def log(msg: Any) = TransmutationPlugin.instance.log(msg)

    private def idKey(name: String) = "recipe_" + name + "_id"
    private def nameKey(name: String) = "recipe_" + name + "_name"
    private def usageLimitKey(name: String) = "recipe_" + name + "_usagelimit"
    private def resultKey(name: String) = "recipe_" + name + "_result"
    private def lineStart(name: String) = "recipe_" + name + "_line"
    private def lineKey(name: String, lineNum: Int) = lineStart(name) + lineNum

    private def loadRecipesBy(allKeys: Set[String], resolve: String => String): List[Recipe] = {

        def slotByDef(raw: String): Slot = {
            val numbers = raw.split("\\D+").filter(_.nonEmpty).map(_.toInt)

            if(numbers.isEmpty){
                throw new Exception("Invalid item definition: '" + raw + "'")
            }

            val id = numbers(0)
            val durability = (numbers.length > 1 match {
                case true => numbers(1)
                case false => 0
            }).toShort

            val (etypez, elevelz) = numbers.drop(2).zipWithIndex.partition(p => p._2 % 2 == 0)

            val enchs = etypez.map(p => {
                val (t, tindex) = p
                val level = elevelz.find(_._2/2 == tindex/2).map(_._1).getOrElse(1)
                t -> level
            }).toMap

            Slot(id = id, durability = durability, enchants = enchs, rawName = "none")
        }

        def slotByRef(raw: String): Option[Slot] = {
            raw match {
                case "air" => None
                case notAir: String => Some({
                    val s = notAir.split("\\*")
                    val (name, count) = s.length match {
                        case 1 => raw -> 1
                        case 2 => s(0) -> s(1).toInt
                        case _ => throw new Exception("Unexpected number of asterisks in slot reference '" + raw + "'")
                    }
                    slotByDef(resolve(name)).copy(count = count, rawName = raw)
                })
            }
        }

        def tryGetRecipe(name: String) = {
            try {
                val namePub = resolve(nameKey(name))
                val limit = resolve(usageLimitKey(name)).toLong
                val id = resolve(idKey(name)).toLong
                val result = slotByRef(resolve(resultKey(name))).getOrElse(throw new Exception("No result specified for recipe '" + name + "'"))
                val lines = allKeys
                    .filter(_.startsWith(lineStart(name)))
                    .map(l => l.replaceAll(lineStart(name), "").toInt -> resolve(l))
                    .toList
                    .sortBy(_._1)
                    .map(_._2.split("[\\s\\t]+").filter(_.nonEmpty).toList.map(slotByRef))
                Some(Recipe(lines, result, namePub, id, limit, name))
            } catch {
                case e: Exception =>
                    log("Could not parse recipe '" + name + "': ")
                    log(e)
                    None
            }
        }

        allKeys.filter(_.matches("^[a-zA-Z\\d_]+$"))
            .filter(_.startsWith("recipe_"))
            .map(_.replaceAll("(^recipe_|_[^_]+$)", ""))
            .flatMap(tryGetRecipe)
            .toList

    }

    val recipes = loadRecipesBy(Config.keys, Config.str).map(r => r.id -> r).toMap

}
