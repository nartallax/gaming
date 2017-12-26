package nartallax.minecraft.launcher

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption._

import nartallax.minecraft.Utils
import nartallax.minecraft.launcher.ClientDownloader._

/**
  * Created by Nartallax on 03.01.2016.
  */
class ClientUpdater(downloader: ClientDownloader, vitalFiles: Iterable[String]) {

  private def backup(clientDir: File, tmpDir: File): File = {
    val hideout = Utils.createDir(tmpDir.toPath.resolve("userFiles").toAbsolutePath.toString)
    vitalFiles.foreach(vitalPath => {
      val from = clientDir.toPath.resolve(vitalPath).toAbsolutePath
      val to = hideout.toPath.resolve(vitalPath).toAbsolutePath

      if(from.toFile.exists){
        Log("Backupping " + vitalPath)
        if(to.toFile.exists){
          Utils.delete(to.toFile)
        }
        Files.move(from, to, REPLACE_EXISTING)
      }
    })
    hideout
  }

  private def unbackup(clientDir: File, backupDir: File) = {
    vitalFiles.foreach(vitalPath => {
      val from = backupDir.toPath.resolve(vitalPath).toAbsolutePath
      val to = clientDir.toPath.resolve(vitalPath).toAbsolutePath
      if(from.toFile.exists) {
        Log("Unbackupping " + vitalPath)
        if(to.toFile.exists){
          Utils.delete(to.toFile)
        }
        Files.move(from, to, REPLACE_EXISTING)
      }
    })
  }

  def update(callback: ClientDownloader.Status => Unit) = {
    val clientDir = new File(downloader.targetDir)
    val tmpDir = new File(downloader.tmpDir)
    Log("Backupping old client files")
    val backupDir = backup(clientDir, tmpDir)
    Log("Old files backupped successfully")

    downloader.download({
        case s: Complete =>
          try {
            Log("Moving back old client files")
            unbackup(clientDir, backupDir)
            Log("Old client files moved back successfully")
            callback(s)
          } catch {
            case e: Exception => callback(new Failure(e))
            case e: Throwable => throw e
          }
        case s: Any => callback(s)
    })

  }

}
