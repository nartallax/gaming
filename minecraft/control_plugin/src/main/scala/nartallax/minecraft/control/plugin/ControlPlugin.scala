package nartallax.minecraft.control.plugin

import nartallax.minecraft.AuthServerApi
import nartallax.minecraft.AuthServerApi.Ban
import org.bukkit.command.{Command, CommandSender, CommandExecutor}
import org.bukkit.plugin.java.JavaPlugin

import scala.collection.JavaConversions._

class ControlPlugin extends JavaPlugin {

    ControlPlugin.instance = this

    val authServer = new AuthServerApi(Config.authServer, Config.authServerKey)

    def log(msg: Any) = getLogger.info(msg.toString)

    private def twoDigit(in: Long) = in > 9 match {
        case true => in.toString
        case false => "0" + in
    }

    private def formatTimeLeft(time: Long) = {
        val days = time / (60 * 60 * 24)
        val hours = twoDigit((time % (60 * 60 * 24)) / (60 * 60))
        val minutes = twoDigit((time % (60 * 60)) / 60)
        val seconds = twoDigit(time % 60)

        s"$days d, $hours:$minutes:$seconds"
    }

    val comExes = Map[String, (CommandSender, Array[String]) => Unit](
        "ban" -> ((sender, args) => {
            args.length < 3 match {
                case true => sender.sendMessage("Usage: /ban playername time_in_seconds reason")
                case false =>
                    val nick = args(0)
                    val time = args(1).toLong
                    val reason = args.drop(2).mkString(" ")
                    authServer.setBan(nick, new Ban(time, reason))
                    getServer.getOnlinePlayers
                        .filter(p => p.getName.equals(nick))
                        .foreach(p => p.kickPlayer("You have been banned.\nReason: " + reason + "\nTime left: " + formatTimeLeft(time)))
                    sender.sendMessage("Set ban on a " + nick + " for " + formatTimeLeft(time) + " seconds with reason '" + reason + "'")
            }
        }),
        "unban" -> ((sender, args) => {
            args.length < 1 match {
                case true => sender.sendMessage("Usage: /unban playername")
                case false =>
                    val nick = args(0)
                    authServer.resetBan(nick)
                    sender.sendMessage("Removed all bans from " + nick)
            }
        }),
        "getban" -> ((sender, args) => {
            args.length < 1 match {
                case true => sender.sendMessage("Usage: /getban playername")
                case false =>
                    val nick = args(0)
                    authServer.getBan(nick) match {
                        case None => sender.sendMessage("No bans detected at player " + nick)
                        case Some(b) => sender.sendMessage("Player " + nick + " is banned for " + formatTimeLeft(b.timeLeft) + " with reason '" + b.reason + "'")
                    }
            }
        }),
        "cluster" -> ((sender, args) => {
            args.length < 1 match {
                case true => sender.sendMessage("Usage: /cluster playername")
                case false =>
                    val nick = args(0)
                    val cluster = authServer.getCluster(nick)
                    sender.sendMessage("Nicks within cluster: " + cluster.nics.mkString(", "))
            }
        })
    )

    override def onEnable() = comExes.foreach(p => {
        getCommand(p._1).setExecutor(new CommandExecutor {
            override def onCommand(commandSender: CommandSender, command: Command, label: String, args: Array[String]): Boolean = {
                command.getName.toLowerCase.equals(p._1) match {
                    case false => false
                    case true =>
                        try {
                            p._2(commandSender, args)
                        } catch {
                            case e: Exception =>
                                commandSender.sendMessage(e.getMessage)
                                e.printStackTrace()
                        }
                        true
                }
            }
        })
    })

}

object ControlPlugin {
    var instance: ControlPlugin = null
}