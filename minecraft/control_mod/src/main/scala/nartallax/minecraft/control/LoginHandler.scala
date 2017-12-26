package nartallax.minecraft.control

import cpw.mods.fml.common.eventhandler.{SubscribeEvent, EventPriority}
import nartallax.minecraft.control.communication.RequestPackage
import net.minecraft.entity.player.{EntityPlayerMP, EntityPlayer}
import net.minecraftforge.event.entity.EntityJoinWorldEvent

object LoginHandler {

    private def randomByte = Math.floor(Math.random() * 256).toByte
    private def randomBytes(count: Int): List[Byte] = count > 0 match {
        case true => randomByte :: randomBytes(count - 1)
        case false => List()
    }

    private def getPackageForNick(nick: String) = {
        println("Assembling verification request package for '" + nick + "'")

        val salt = randomBytes(8).toArray

        val pkg = new RequestPackage()
        pkg.salt = salt
        pkg.id = ControlMod.instance.checker.registerCheck(pkg.saltStr, nick)

        println("Verification request salt for '" + nick + "' is '" + pkg.saltStr + "'")

        pkg
    }

    @SubscribeEvent(priority=EventPriority.NORMAL, receiveCanceled=true)
    def onEvent(e: EntityJoinWorldEvent) = {
        e.entity match {
            case p: EntityPlayerMP => ControlMod.instance.dispatcher.sendTo(getPackageForNick(p.getCommandSenderName), p)
            case _ =>
        }
    }

}
