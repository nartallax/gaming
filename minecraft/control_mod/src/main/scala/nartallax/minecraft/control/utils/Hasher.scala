package nartallax.minecraft.control.utils

import java.io.InputStream

import net.jpountz.xxhash.XXHashFactory

case class Hasher(seed: Int, bufferSize: Int = 16 * 1024) extends (InputStream => String) {

    private def getHasher = XXHashFactory.fastestInstance().newStreamingHash32(seed)

    override def apply(in: InputStream): String = {
        val hasher = getHasher
        val buffer = new Array[Byte](bufferSize)
        var bytesRead = in.read(buffer)
        while(bytesRead > -1){
            hasher.update(buffer, 0, bytesRead)
            bytesRead = in.read(buffer)
        }

        Integer.toHexString(hasher.getValue).toUpperCase
    }

    def hash(in: String, charset: String = "utf8"): String = hash(in.getBytes(charset))

    def hash(in: Array[Byte]): String = {
        val hasher = getHasher
        hasher.update(in, 0, in.length)
        Integer.toHexString(hasher.getValue).toUpperCase
    }

}
