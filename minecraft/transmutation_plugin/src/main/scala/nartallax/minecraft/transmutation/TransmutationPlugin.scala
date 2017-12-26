package nartallax.minecraft.transmutation

import nartallax.minecraft.AuthServerApi
import org.bukkit.command.{Command, CommandSender, CommandExecutor}
import org.bukkit.enchantments.EnchantmentWrapper
import org.bukkit.entity.Player
import org.bukkit.inventory.ItemStack
import org.bukkit.plugin.java.JavaPlugin

class TransmutationPlugin extends JavaPlugin {
    TransmutationPlugin.instance = this

    def log(msg: Any) = getLogger.info(msg.toString)

    def recipes = RecipeBook.recipes

    val authServer = new AuthServerApi(Config.authServer, Config.authServerKey)

    def format(raw: String, args: String*) = {
        var result = raw
        //log("Formatting string '" + raw + "' with '" + args.mkString("', '") + "'")
        args.zipWithIndex.reverse.foreach(p => {
            val (arg, num) = p
            result = result.replaceAll("\\$" + (num + 1), arg)
        })
        result
    }

    def noRecipesFoundMessage = Config.str("message_no_recipes_found")
    def recipeExhaustedMessage(name: String, usageCount: Long, usageLimit: Long) =
        format(Config.str("message_recipe_exhausted"), name, usageCount.toString, usageLimit.toString)
    def recipeAppliedMessage(name: String, usagesApplied: Long, usagesLeft: Option[Long]) = usagesLeft match {
        case None => format(Config.str("message_recipe_applied_unlimited"), name, usagesApplied.toString)
        case Some(left) => format(Config.str("message_recipe_applied_limited"), name, usagesApplied.toString, left.toString)
    }
    def recipeDisabledMessage(name: String) =
        format(Config.str("message_recipe_disabled"), name)
    def helpMessage() = Config.str("message_help").split("\\|").map(_.trim).filter(_.nonEmpty)
    def listMessage(in: Iterable[Recipe]) = Config.str("message_list") :: in.toList.map(r => {
        format(Config.str("message_list_item"), r.rawName, r.name, r.result.toString)
    })
    def showMessage(in: Recipe) = List(
        format(Config.str("message_show_name"), in.name),
        format(Config.str("message_show_result"), in.result.toString),
        format(Config.str("message_show_usage_limit"), in.usageLimit.toString)
    ) ::: in.slots.map(l => l.map({
        case None => "(nothing)"
        case Some(s) => s.toString
    }).mkString(" ")).zipWithIndex.map(p => format(Config.str("message_show_recipe_line"), (p._2 + 1).toString, p._1))
    def idNotSuppliedMessage() = Config.str("message_id_not_supplied")
    def noRecipeForIdMesssage(id: String) = format(Config.str("message_no_recipe_found_for_id"), id)
    def unknownCommandMessage(comm: String) = format(Config.str("message_unknown_command"), comm)

    def findRecipes(in: InventoryWrap, exhaustedRecipes: Set[Long]): List[CraftPoint] = {
        var result = List[CraftPoint]()

        def isBlocking(s: CraftPoint) = result.exists(p => s.left >= p.left && s.right <= p.right && s.top >= p.top && s.bottom <= p.bottom)
        def tryAdd(s: CraftPoint) = if(!isBlocking(s)) result = s :: result
        def recipeOrder(r: Recipe) = r.disabled match {
            case true => 3
            case false => exhaustedRecipes.contains(r.id) match {
                case true => 2
                case false => 1
            }
        }

        recipes.values.toList
            .sortBy(recipeOrder)
            .foreach(r => r.findAllStart(in).foreach(tryAdd))

        result
    }

    def uniqRecipes(in: List[CraftPoint]) = in.map(p => p.recipe -> p).toMap.values


    def transmutate(player: Player) = {
        def say(in: String) = player.sendMessage(in)

        val inv = InventoryWrap(player.getInventory)
        val usageCount = authServer.getTransmutations(player.getName)

        def dropAtPlayer(stack: ItemStack) = player.getWorld.dropItemNaturally(player.getLocation, stack)

        def usageCountOf(id: Long) = usageCount.getOrElse(id, 0l)
        def usageLimitOf(id: Long) = recipes.get(id).map(_.usageLimit).getOrElse(0l)
        def usagesLeftOf(id: Long) = recipes.get(id).map(_.maxUsages(usageCountOf(id))).getOrElse(0l)
        val exhaustedRecipes = usageCount.filter(p => p._2 >= usageLimitOf(p._1)).keySet

        val rawRecipes = findRecipes(inv, exhaustedRecipes)

        rawRecipes.isEmpty match {
            case true => say(noRecipesFoundMessage)
            case false =>
                val (disabled, enabled) = rawRecipes.partition(_.recipe.disabled)
                val (exhausted, notExhaustedRaw) = enabled.partition(p => exhaustedRecipes.contains(p.recipe.id))

                val notExhausted = notExhaustedRaw.map(p => p.copy(count = Math.min(usagesLeftOf(p.recipe.id), p.count)))

                uniqRecipes(disabled).foreach(p => say(recipeDisabledMessage(p.recipe.name)))
                uniqRecipes(exhausted).foreach(p => say(recipeExhaustedMessage(p.recipe.name, usageCountOf(p.recipe.id), usageLimitOf(p.recipe.id))))

                val appliedRecipes = uniqRecipes(notExhausted)

                authServer.increaseTransmutations(player.getName, appliedRecipes.map(r => r.recipe.id -> r.count).toMap)

                appliedRecipes.foreach(p => {
                    say(recipeAppliedMessage(p.recipe.name, p.count, if(p.recipe.limited) Some(usagesLeftOf(p.recipe.id) - p.count) else None))

                    p.eachPoint((x, y, mbSlot) => {
                        //println(s"Removing ${mbSlot.map(_.count).getOrElse(0) * p.count} items from $x, $y")
                        inv.removeAt(x, y, mbSlot.map(_.count).getOrElse(0) * p.count)
                    })
                    player.getInventory.setContents(inv.inner.getContents)
                    player.updateInventory()

                    val singleResultStack = p.recipe.result.toItemStack
                    (1L to p.count).foreach(n => dropAtPlayer(singleResultStack))
                })
        }

    }

    override def onEnable() = getCommand("transmutate").setExecutor(new CommandExecutor {
        override def onCommand(commandSender: CommandSender, command: Command, label: String, args: Array[String]): Boolean = {

            def say(in: String): Unit = commandSender.sendMessage(in)

            command.getName.toLowerCase.equals("transmutate") match {
                case false => false
                case true =>
                    args.length match {
                        case 0 => commandSender match {
                            case p: Player => transmutate(p)
                            case _ => commandSender.sendMessage("Only players are able to execute this command.")
                        }
                        case _ => args.head.toLowerCase.trim match {
                            case "help" => helpMessage().foreach(say)
                            case "list" => listMessage(RecipeBook.recipes.values).foreach(say)
                            case "show" => args.length > 1 match {
                                case false => say(idNotSuppliedMessage())
                                case true =>
                                    val rid = args(1).toLowerCase.trim
                                    RecipeBook.recipes.values.find(r => r.rawName.toLowerCase.trim.equals(rid)) match {
                                        case None => say(noRecipeForIdMesssage(rid))
                                        case Some(r) => showMessage(r).foreach(say)
                                    }
                            }
                            case comm:String => say(unknownCommandMessage(comm))
                        }
                    }
                    true
            }
        }
    })

}

object TransmutationPlugin {

    var instance: TransmutationPlugin = null

}