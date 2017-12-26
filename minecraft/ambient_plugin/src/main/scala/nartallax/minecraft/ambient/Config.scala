package nartallax.minecraft.ambient

object Config extends nartallax.minecraft.ModuleConfig(AmbientPlugin.instance.getDataFolder, defaultConfigResourcePath = "/ambient-plugin-default.conf") {

    def dayCycleLength = int("day_cycle_length")
    def dayTimesWeight = (double("dawn_weight"), double("day_weight"), double("dusk_weight"), double("night_weight"))
    def dayTimesStarts = (int("dawn_start"), int("day_start"), int("dusk_start"), int("night_start"))

    def weatherCycle = double("weather_cycle") -> double("weather_cycle_margin")
    def calmWeight = double("calm_weight") -> double("calm_weight_margin")
    def rainWeight = double("rain_weight") -> double("rain_weight_margin")
    def stormWeight = double("storm_weight") -> double("storm_weight_margin")
    def weatherMinLength = int("weather_min_length")
    def weatherFrequency = double("weather_frequency") -> double("weather_frequency_margin")

}