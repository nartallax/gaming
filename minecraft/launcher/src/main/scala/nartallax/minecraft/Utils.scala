package nartallax.minecraft

import java.io.{File, InputStream}

import sun.misc.IOUtils

object Utils {

    def readAndClose(in: InputStream) = {
        try {
            IOUtils.readFully(in, -1, false)
        } finally {
            in.close
        }
    }

    def delete(dir: File): Unit = {
        if(dir.isDirectory) dir.listFiles().foreach(delete)
        dir.delete()
    }

    def createDir(path: String) = {
        val parts = new File(path).getAbsolutePath.split(s"\\${File.separator}").toList
        val absParts = parts.zipWithIndex.map(p => parts.take(p._2).mkString(File.separator) + File.separator + p._1).toList
        var f: File = null
        absParts.foreach(p => {
            f = new File(p)
            f.delete()
            if(!f.exists()) f.mkdir()
        })
        f
    }

}
