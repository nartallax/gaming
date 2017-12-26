package nartallax.minecraft.transmutation

case class Recipe(slots: List[List[Option[Slot]]], result: Slot, name: String, id: Long, usageLimit: Long, rawName: String) {

    def limited = usageLimit >= 0
    def disabled = usageLimit == 0
    def maxUsages(usageCount: Long = 0) = limited match {
        case false => 0xffffl
        case true => Math.max(usageLimit - usageCount, 0)
    }

    lazy val width = slots.map(_.size).sortBy(n => n).reverse.head
    lazy val height = slots.size

    def at(x: Int, y: Int): Option[Slot] = {
        val line = slots(y)
        line.length > x match {
            case false => None
            case true => line(x)
        }
    }

    def findAllStart(inv: InventoryWrap): List[CraftPoint] = {
        println("Searhing for recipe application")
        slots.foreach(l => println(l))
        inv.each((x, y, slot) => {
            val count = applicationsCountAt(inv, x, y)
            CraftPoint(x, y, this, count)
        }).filter(_.count > 0)
    }

    def applicationsCountAt(inv: InventoryWrap, x: Int, y: Int): Long = {

        def lineApplicationsCount(line: List[Option[Slot]], x: Int, y: Int): Long = {
            line.zipWithIndex
                .map(p => {
                    val mbItem = inv.at(p._2 + x, y)
                    val mbSlot = p._1

                    mbSlot match {
                        case None => 0xfffL
                        case Some(slot) => mbItem match {
                            case None => 0
                            case Some(item) => slot.matchCount(Slot.fromItemStack(item, "none"))
                        }
                    }
                })
            .sortBy(n => n).headOption.getOrElse(0xffffL)
        }

        slots.zipWithIndex
            .map(p => lineApplicationsCount(p._1, x, p._2 + y))
            .sortBy(n => n).headOption.getOrElse(0L)
    }

}
