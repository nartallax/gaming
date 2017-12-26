package nartallax.minecraft.launcher

import java.io.File

import nartallax.minecraft.{AuthServerApi, Utils, UpdateServerApi, ModuleConfig}
import nartallax.minecraft.launcher.ClientDownloader.{Failure, Complete, UnpackingInProgress, DownloadInProgress}
import nartallax.minecraft.launcher.gui.MainWindow

import scala.concurrent.{ExecutionContext, Future}


object Main extends App {

    Utils.createDir(Config("inner_dir_path"))

    val authServer = new AuthServerApi(Config("auth_server_url"))
    val updateServer = new UpdateServerApi(Config("update_server_url"))

    Log("Launcher started.")

    val mainWindow = new MainWindow(Config, authServer, updateServer, requestClientLaunch)
    mainWindow.setVisible(true)

    def requestClientLaunch(settings: ModuleConfig, needUpdate: Boolean) = {
        val mcDir = new File(settings("dir"))
        val forgeDir = mcDir.toPath.resolve(Config("forge_dir_path")).toFile
        Utils.createDir(settings("dir"))

        updateAndLaunch(forgeDir.getAbsolutePath, needUpdate, settings)
    }

    def updateClient(settings: ModuleConfig, callback: () => Unit) = {
        mainWindow.screen("download")
        val label = mainWindow.labels("progress")

        def mb(bytes: Long) = String.format("%.2f", (bytes.toDouble / (1024 * 1024)).asInstanceOf[java.lang.Double]) + " мб"

        def format(now: Long, total: Long) = {
            s"${mb(now)} / ${mb(total)}, ${String.format("%.2f", ((now.toDouble / total.toDouble) * 100).asInstanceOf[java.lang.Double])}%"
        }

        new ClientUpdater(
            new ClientDownloader(
                settings("inner_dir_path"),
                settings("dir"),
                updateServer.withPackedClientStream
            ),
            settings("backupped_files").split(",")
        ).update({
            case DownloadInProgress(b, l) =>
                label.setText("Загружено " + format(b, l))
            case UnpackingInProgress(b) =>
                label.setText("Загружено " + mb(b) + ", распаковка...")
            case Complete(b) =>
                label.setText("Завершено!")
                settings.update("update" -> updateServer.getClientTime().toString)
                callback()
            case Failure(e) =>
                label.setText("Что-то сдохло. Подробности в логе.")
                Log(e.getMessage)
                e.printStackTrace(Log.out)
        })
    }

    def launchClient(settings: ModuleConfig, forgeDir: File) = {
        val parser = new ForgeParser(forgeDir.getAbsolutePath)
        val command = parser.commandFor(settings("id"), "-Xmx" + settings("mem") + " " + settings("tweaks"))

        Log("working dir: " + parser.mcRoot.toString)
        Log(command)


        val clientOut = new File(settings("client_output_path"))
        new ProcessBuilder(command: _*)
            .directory(new File(parser.mcRoot))
            .redirectOutput(clientOut)
            .redirectErrorStream(true)
            .start()

        Log("Launch command issued.")

        mainWindow.screen("launch")
        Future {
            Thread.sleep(2500)
            System.exit(0)
        }(ExecutionContext.global)
    }

    def updateAndLaunch(forgeDir: String, forceUpdate: Boolean, settings: ModuleConfig): Unit = {
        val forge = new File(forgeDir)

        if(!forge.exists || forceUpdate) {
            updateClient(settings, () => updateAndLaunch(forgeDir, false, settings))
        } else {
            launchClient(settings, forge)
        }
    }
}
