package nartallax.minecraft.launcher

import java.awt.{Font, Color}
import java.io.File

object Config extends nartallax.minecraft.ModuleConfig(new File("launcher"), "->", "settings", defaultConfigResourcePath = "/launcher-default.conf") {

    override def str(key: String) = key match {
        case "inner_dir_path" => "./launcher/"
        case "settings_path" => "./launcher/settings"
        case "backupped_files" => "options.txt,optionsof.txt,servers.dat,screenshots,saves,logs,journeymap,crash-reports,config"
        case _ => super.str(key)
    }

    override def apply(key: String) = str(key)

    def color(key: String) = {
        val raw = str(key).split("\\D+").map(_.toInt)
        new Color(raw(0), raw(1), raw(2))
    }

    lazy val font = new Font(str("font_family"), Font.BOLD, int("font_size").toInt)
}
