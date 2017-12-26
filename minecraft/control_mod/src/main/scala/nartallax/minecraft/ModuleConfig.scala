package nartallax.minecraft

import java.io._

import sun.misc.IOUtils

case class ModuleConfig(dataFolder: File, kvSeparator: String = "=", fileName: String = "config.conf", defaultConfigResourcePath: String = "/control-mod-default.conf")
    extends (String => String){

    val configFile = dataFolder.toPath.resolve(fileName).toAbsolutePath.toFile

    private def readStream(f: InputStream) = try {
        new String(IOUtils.readFully(f, -1, false), "utf-8")
    } finally {
        f.close()
    }

    private def writeStream(s: OutputStream, d: String) = try {
        s.write(d.getBytes("utf-8"))
    } finally {
        s.close()
    }

    private def createOrLoadFile() = {
        dataFolder.mkdir()

        if(configFile.exists()){
            readStream(new FileInputStream(configFile))
        } else {
            val result = readStream(getClass.getResourceAsStream(defaultConfigResourcePath))
            writeStream(new FileOutputStream(configFile), result)
            result
        }
    }

    private def parseFileContent(content: String): Map[String, String] = content
        .split("[\n\r]+")
        .map(_.trim)
        .filter(l => l.contains(kvSeparator) && !l.startsWith("#"))
        .map(l => {
            val eqSign = l.indexOf(kvSeparator)
            l.substring(0, eqSign).trim -> l.substring(eqSign + kvSeparator.length).trim
        }).toMap

    private def loadFields() = parseFileContent(createOrLoadFile())

    lazy val defaults = parseFileContent(readStream(getClass.getResourceAsStream(defaultConfigResourcePath)))
    lazy val values = loadFields()

    def str(key: String): String = values.getOrElse(key, defaults(key))
    def int(key: String): Long = {
        val raw = str(key)
        (raw.matches("^\\d+$") match {
            case false => defaults(key)
            case true => raw
        }).toLong
    }
    def double(key: String): Double = {
        val raw = str(key)
        (raw.matches("^\\d+(?:\\.\\d+)?$") match {
            case false => defaults(key)
            case true => raw
        }).toDouble
    }
    def bool(key: String): Boolean = {
        str(key) match {
            case "1" | "+" | "true" => true
            case "0" | "-" | "false" => false
            case _ => defaults(key) match {
                case "1" | "+" | "true" => true
                case _ => false
            }
        }
    }

    def update(kvs: (String, String)*): ModuleConfig = {
        val fileContent = (defaults ++ values ++ kvs.toMap).map(kv => kv._1 + kvSeparator + kv._2).mkString("\n")
        writeStream(new FileOutputStream(configFile), fileContent)
        ModuleConfig(dataFolder, kvSeparator, fileName, defaultConfigResourcePath)
    }

    override def apply(key: String) = str(key)

}
