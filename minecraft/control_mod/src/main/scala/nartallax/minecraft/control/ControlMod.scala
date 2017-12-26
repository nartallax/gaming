package nartallax.minecraft.control

import cpw.mods.fml.common.Mod
import cpw.mods.fml.common.Mod.{EventHandler, Instance}
import cpw.mods.fml.common.event.FMLPreInitializationEvent
import cpw.mods.fml.common.network.NetworkRegistry
import cpw.mods.fml.relauncher.Side
import nartallax.minecraft.control.communication.{ResponsePackage, RequestPackage}
import nartallax.minecraft.control.utils.Hasher
import net.minecraft.entity.player.EntityPlayerMP
import net.minecraft.server.MinecraftServer
import net.minecraftforge.common.MinecraftForge

object ControlMod {
    val modId = "nartallax-control-mod"
    val modName = "Nartallax's Minecraft Control Mod"
    val modVersion = "0.1"

    @Instance(value="nartallax-control-mod")
    var instance: ControlMod = null
}

@Mod(modid="nartallax-control-mod", name="Nartallax's Minecraft Control Mod", version="0.1")
class ControlMod {

    ControlMod.instance = this

    def kick(nick: String, reason: String) = MinecraftServer
        .getServer
        .getEntityWorld
        .getPlayerEntityByName(nick)
        .asInstanceOf[EntityPlayerMP]
        .playerNetServerHandler
        .kickPlayerFromServer(reason)

    lazy val checker = new Checker(new Hasher(Config.hashSeed), Config.checkTimeout, kick(_, "Verification time exceeded."))

    val dispatcher = NetworkRegistry.INSTANCE.newSimpleChannel("nartallax-control")

    @EventHandler
    def fmlLifeCycleEvent(e: FMLPreInitializationEvent){
        dispatcher.registerMessage(classOf[RequestHandler], classOf[RequestPackage], 0, Side.CLIENT)
        dispatcher.registerMessage(classOf[ResponseHandler], classOf[ResponsePackage], 1, Side.SERVER)
    }

    MinecraftForge.EVENT_BUS.register(LoginHandler)


}