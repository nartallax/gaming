package nartallax.minecraft.launcher

import java.io.{File, FileOutputStream, InputStream}

import nartallax.minecraft.Utils
import nartallax.minecraft.launcher.ClientDownloader.Failure
import net.lingala.zip4j.core.ZipFile

import scala.concurrent.{ExecutionContext, Future}

object ClientDownloader {
    abstract class Status
    case class DownloadInProgress(bytesDownloaded: Long, totalBytes: Long) extends Status
    case class UnpackingInProgress(bytesDownloaded: Long) extends Status
    case class Complete(bytesDownloaded: Long) extends Status
    case class Failure(reason: Exception) extends Status
}

case class ClientDownloader(tmpDir: String, targetDir: String, withClientInputStream: ((InputStream, Long) => Unit) => Unit, execCont: ExecutionContext = ExecutionContext.global) {

    private def withOutputStream(path: String, body: FileOutputStream => Unit) = {
        val out = new FileOutputStream(new File(path))
        try {
            body(out)
        } finally {
            out.flush()
            out.close
        }
    }

    private def readInputStream(in: InputStream, body: (Array[Byte], Long, Long) => Unit) = {
        val buffer = new Array[Byte](64 * 1024)
        var readedLastTime: Long = in.read(buffer)
        var readedTotal: Long = 0
        while(readedLastTime >= 0){
            readedTotal += readedLastTime
            body(buffer, readedLastTime, readedTotal)
            readedLastTime = in.read(buffer)
        }
    }

    def download(callback: ClientDownloader.Status => Unit) = Future {
        Log("Starting to download client.")
        try {
            val tmpFile = new File(tmpDir).toPath.resolve("client.zip").toFile.getAbsolutePath
            Utils.delete(new File(targetDir))

            var total: Long = 0

            withOutputStream(tmpFile, out => {

                withClientInputStream((in, totalLength) => {
                    readInputStream(in, (buffer, readedLastTime, readedTotal) => {

                        total = readedTotal
                        out.write(buffer, 0, readedLastTime.toInt)
                        callback(new ClientDownloader.DownloadInProgress(readedTotal, totalLength))

                    })
                })
            })

            Log("Download finished successfully")

            Log("Starting to unpack downloaded client...")
            callback(new ClientDownloader.UnpackingInProgress(total))

            val packedClient = new ZipFile(tmpFile)
            packedClient.extractAll(targetDir)
            Log("Unpacking successful. Removing packed client...")
            new File(tmpFile).delete
            Log("Done.")

            callback(new ClientDownloader.Complete(total))
        } catch {
            case e: Exception => callback(new Failure(e))
            case e: Throwable => throw e
        }
    }(execCont)
}
