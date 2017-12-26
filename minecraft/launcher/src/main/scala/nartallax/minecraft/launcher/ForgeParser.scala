package nartallax.minecraft.launcher

import java.io.{FileNotFoundException, File, FileInputStream}

import nartallax.minecraft.Utils

class ForgeParser(forgeDir: String) {

    lazy val mcRoot = normalizePath(new File(forgeDir).toPath.toAbsolutePath.resolve("..").resolve("..").toAbsolutePath.toString)
    private lazy val libRoot = normalizePath(new File(mcRoot).toPath.resolve("libraries").toAbsolutePath.toString)
    private lazy val assetsDir = normalizePath(new File(mcRoot).toPath.resolve("assets").toAbsolutePath.toString)

    private lazy val forgeJsonFilePath = normalizePath(new File(forgeDir).listFiles().map(_.getAbsolutePath).filter(_.endsWith(".json")).head)
    private lazy val forgeJarFilePath = normalizePath(new File(forgeDir).listFiles().map(_.getAbsolutePath).filter(_.endsWith(".jar")).head)
    private lazy val nativesDirPath = normalizePath(new File(forgeDir).listFiles().find(_.isDirectory).map(_.getAbsolutePath).get)
    private lazy val javaExecutablePath = normalizePath(System.getProperty("java.home") + List("", "bin", "java").mkString(File.separator))

    private lazy val jsonRaw = new String(Utils.readAndClose(new FileInputStream(new File(forgeJsonFilePath))), "utf8")
    private lazy val jsonRoot = scala.util.parsing.json.JSON.parseFull(jsonRaw).get.asInstanceOf[Map[String, Any]]

    private def findLibs(f: File): List[File] = {
        f.isDirectory match {
            case true => f.listFiles().toList.flatMap(findLibs)
            case false => f.getName.endsWith(".jar") match {
                case true => List(f)
                case false => List()
            }
        }
    }

    private lazy val libFiles = findLibs(new File(libRoot)).map(_.getAbsolutePath)
    private lazy val libsRaw = jsonRoot("libraries").asInstanceOf[List[Map[String, Any]]]

    private val upDirReg = "[\\/\\\\][^\\/\\\\]+[\\/\\\\]\\.\\.(?=[\\/\\\\]|$)".r
    private val curDirReg = "[\\/\\\\]\\.(?=[\\/\\\\]|$)".r
    private def normalizePath(path: String) = {
        var res = path

        while(upDirReg.findFirstIn(res).nonEmpty) res = upDirReg.replaceFirstIn(res, "")
        while(curDirReg.findFirstIn(res).nonEmpty) res = curDirReg.replaceFirstIn(res, "")

        res
    }

    private def resolveLib(rawName: String): Option[String] = {
        val pathParts = rawName.split(":")
        val path = (pathParts.head.split(".") ++ pathParts.drop(1)).mkString(File.separator)
        libFiles.find(_.contains(path)) match {
            case Some(s) => s.contains("platform") match {
                case false => Some(s)
                case true => None // no need to load this lib
            }
            case None => throw new FileNotFoundException("Could not find suitable library file for " + rawName)
        }
    }

    private lazy val libs = libsRaw.flatMap(map => resolveLib(map("name").asInstanceOf[String]))
    private lazy val classPath = (libs ++ List(forgeJarFilePath)).mkString(File.pathSeparatorChar.toString)
    private lazy val javaKeys = List(s"-Djava.library.path=$nativesDirPath",s"-Duser.dir=$mcRoot","-cp") ++ List(classPath)

    private lazy val mainClassPath = List("net.minecraft.launchwrapper.Launch")
    private lazy val fmlTweaks = List("-Dfml.ignoreInvalidMinecraftCertificates=true", "-Dfml.ignorePatchDiscrepancies=true")
    private lazy val forgePathKeys = List("--gameDir", mcRoot, "--assetsDir", assetsDir)
    private lazy val forgeSettingKeys = List(
        "--version","ForgeOptiFine 1.7.10",
        "--assetIndex","1.7.10",
        "--userProperties","[]",
        "--userType","legacy",
        "--accessToken","null",
        "--uuid","00000000-0000-0000-0000-000000000000",
        "--tweakClass","cpw.mods.fml.common.launcher.FMLTweaker"
    )
    private def forgeKeysFor(id: String) = List("--username", id) ::: forgePathKeys ::: forgeSettingKeys

    def commandFor(id: String, tweaks: String = "") =
        List(javaExecutablePath) ++ tweaks.split("\\s+") ++ javaKeys ++ fmlTweaks ++ mainClassPath ++ forgeKeysFor(id)

}
