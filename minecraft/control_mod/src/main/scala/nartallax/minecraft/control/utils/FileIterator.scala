package nartallax.minecraft.control.utils

import java.io.{FileInputStream, File}
import java.util.concurrent.{TimeUnit, Executors}

import sun.misc.IOUtils

import scala.util.matching.Regex

case class FileIterator(regexp: Regex, threadCount: Int = 10) {

    private def getPool = Executors.newFixedThreadPool(threadCount)

    private def getFilesOf(f: File): List[File] = f.exists match {
        case false => List()
        case true => f.isDirectory match {
            case false => List(f)
            case true => f.listFiles().flatMap(getFilesOf).toList
        }
    }

    private def fileList = {
        val thisDir = new File(".")
        val thisDirPath = thisDir.getAbsolutePath
        getFilesOf(thisDir).filter(f => {
            //println(f.getAbsolutePath.substring(thisDirPath.length + 1) + " -> " + regexp.findFirstIn(f.getAbsolutePath.substring(thisDirPath.length + 1)).nonEmpty)
            regexp.findFirstIn(f.getAbsolutePath.substring(thisDirPath.length + 1)).nonEmpty
        })
    }

    def iterate(body: File => Unit) = {
        val pool = getPool

        fileList.foreach(f => pool.execute(new Runnable {
            override def run(): Unit = body(f)
        }))

        pool.shutdown()
        pool.awaitTermination(100000, TimeUnit.DAYS)
    }
    def iterateStream(body: (File, FileInputStream) => Unit) = iterate(f => {
        val in = new FileInputStream(f)
        try {
            body(f, in)
        } finally {
            in.close()
        }
    })
    def iterateContent(body: (File, Array[Byte]) => Unit) = iterateStream((f, s) => body(f, IOUtils.readFully(s, -1, false)))

}
