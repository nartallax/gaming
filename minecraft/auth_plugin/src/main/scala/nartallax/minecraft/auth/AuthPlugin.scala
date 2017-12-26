package nartallax.minecraft.auth

import nartallax.minecraft.AuthServerApi
import org.bukkit.event.{HandlerList, Listener, EventPriority, EventHandler}
import org.bukkit.event.player.PlayerLoginEvent
import org.bukkit.plugin.Plugin
import org.bukkit.plugin.java.JavaPlugin

import AuthServerApi.ApiStatusException
import AuthServerApi.ApiError._

class AuthPlugin extends JavaPlugin with Listener  {

    AuthPlugin.instance = this

    private val authServer = AuthServerApi(Config("auth_server_url"))

    override def onEnable() = getServer.getPluginManager.registerEvents(this, this)
    override def onDisable() = HandlerList.unregisterAll(this.asInstanceOf[Plugin])

    private def log(msg: String) = getLogger.info(msg)

    @EventHandler(priority = EventPriority.HIGHEST)
    def onLogin(event: PlayerLoginEvent) = {

        val id = event.getPlayer.getName
        try {
            alterNameOnJoin(event, authServer.nick(id))
            event.setResult(PlayerLoginEvent.Result.ALLOWED)
        } catch {
            case ApiStatusException(e) =>
                alterNameOnJoin(event, "UNKNOWN_PLAYER")
                val kickMessage = e match {
                    case NotRegistered => "Not registered."
                    case InvalidId => "Auth server don't accepts your user id. Maybe its configuration changed?"
                    case _ => "Auth server answers with unexpected error code. Seems like it's compromised."
                }
                event.setResult(PlayerLoginEvent.Result.KICK_OTHER)
                event.setKickMessage(kickMessage)
        }
    }

    private def alterNameOnJoin(event: PlayerLoginEvent, newName: String) = {
        val player = event.getPlayer
        val oldName = player.getName

        DarkMagic.renamePlayer(player, newName, msg => { /*log(msg)*/ })

        log(s"Player $newName logged in (former $oldName)")
    }

}

object AuthPlugin {
    var instance: AuthPlugin = null
}