package nartallax.minecraft.worldborder

import java.util.concurrent.atomic.AtomicBoolean

import org.bukkit.Bukkit
import org.bukkit.event.player.PlayerLoginEvent
import org.bukkit.event.{HandlerList, EventHandler, Listener}
import org.bukkit.plugin.Plugin
import org.bukkit.plugin.java.JavaPlugin

import scala.concurrent.{ExecutionContext, Future}

class WorldBorderIdleGeneratorPlugin extends JavaPlugin with Listener {

    private val updateFreq = 15 * 1000; // msec
    private val startCommand = "wb fill pause"
    private val stopCommand = "wb fill pause"
    private val allowedPlayerCount = 0

    private def log(msg: String) = getLogger.info(msg)
    private def sendCommand(command: String) = Bukkit.getServer.dispatchCommand(Bukkit.getConsoleSender, command)

    private val generationIsRunning = new AtomicBoolean(true)
    private def start() = {
        if(!generationIsRunning.get){
            generationIsRunning.set(true)
            log("Enabling world autogeneration")
            sendCommand(startCommand)
        }
    }
    private def stop() = {
        if(generationIsRunning.get) {
            generationIsRunning.set(false)
            log("Disabling world autogeneration")
            sendCommand(stopCommand)
        }
    }

    private def checkGenerationState() = {
        val playerCount = getServer.getOnlinePlayers.size
        if(playerCount > allowedPlayerCount){
            stop()
        } else {
            start()
        }
    }

    @EventHandler
    def onLogin(event: PlayerLoginEvent) = stop()

    override def onEnable() = {
        getServer.getPluginManager.registerEvents(this, this)
        checkCancelled.set(false)
        scheduleCheck()
    }
    override def onDisable() = {
        checkCancelled.set(true)
        HandlerList.unregisterAll(this.asInstanceOf[Plugin])
    }

    private val checkCancelled = new AtomicBoolean(true)
    private def scheduleCheck(): Unit = {
        Future {
            Thread.sleep(updateFreq)
            if(!checkCancelled.get){
                scheduleCheck()
                checkGenerationState()
            }
        }(ExecutionContext.global)
    }

}

