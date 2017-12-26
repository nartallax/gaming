package nartallax.minecraft.control.communication

import java.util.Base64
import java.util.concurrent.atomic.AtomicLong

import cpw.mods.fml.common.network.simpleimpl.IMessage
import io.netty.buffer.ByteBuf

class RequestPackage extends IMessage {

    var salt: Array[Byte] = null
    var id: Long = -1

    def saltStr = new String(Base64.getEncoder.encode(salt), "utf8")

    override def toBytes(out: ByteBuf) = {
        out.writeLong(id)
        out.writeInt(salt.length)
        out.writeBytes(salt, 0, salt.length)
    }

    override def fromBytes(in: ByteBuf) = {
        id = in.readLong()
        salt = new Array[Byte](in.readInt())
        in.readBytes(salt, 0, salt.length)
    }
}