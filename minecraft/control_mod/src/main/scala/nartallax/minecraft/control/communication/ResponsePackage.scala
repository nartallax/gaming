package nartallax.minecraft.control.communication

import cpw.mods.fml.common.network.simpleimpl.IMessage
import io.netty.buffer.ByteBuf

class ResponsePackage extends IMessage {

    var requestId: Long = -1
    var macs: List[Array[Byte]] = null
    var hash: String = null

    override def toBytes(out: ByteBuf) = {
        out.writeLong(requestId)
        out.writeInt(macs.size)
        macs.foreach(m => {
            out.writeInt(m.length)
            out.writeBytes(m, 0, m.length)
        })
        val hashBytes = hash.getBytes("utf8")
        out.writeInt(hashBytes.length)
        out.writeBytes(hashBytes, 0, hashBytes.length)
    }

    override def fromBytes(in: ByteBuf) = {
        requestId = in.readLong()

        var macCount = in.readInt()
        macs = List()
        while(macCount > 0){
            macCount = macCount - 1
            val bytes = new Array[Byte](in.readInt())
            in.readBytes(bytes, 0, bytes.length)
            macs = bytes :: macs
        }

        val buffer = new Array[Byte](in.readInt())
        in.readBytes(buffer, 0, buffer.length)
        hash = new String(buffer, "utf8")
    }

}
