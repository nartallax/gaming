package nartallax.minecraft.telemetry

import nartallax.minecraft.ModuleConfig

object Config extends ModuleConfig(TelemetryPlugin.instance.getDataFolder, defaultConfigResourcePath = "/telemetry-plugin-default.conf")
