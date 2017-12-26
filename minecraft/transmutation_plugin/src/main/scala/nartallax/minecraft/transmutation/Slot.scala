package nartallax.minecraft.transmutation

import org.bukkit.enchantments.EnchantmentWrapper
import org.bukkit.inventory.ItemStack

import scala.collection.JavaConversions._

case class Slot(id: Int, durability: Short = 0, count: Int = 1, enchants: Map[Int, Int] = Map(), rawName: String) {

    def toItemStack = {
        val stack = new ItemStack(id, count, durability)
        enchants.foreach(p => stack.addEnchantment(new EnchantmentWrapper(p._1), p._2))
        stack
    }

    def lesserOrEqualThan(other: Slot) = other.id == id && other.durability == durability && haveAllTheEnhcants(other.enchants)
    def greaterOrEqualThan(other: Slot) = other.lesserOrEqualThan(this)

    def matchCount(in: Slot): Long = {
        this.lesserOrEqualThan(in) match {
            case false => 0
            case true => in.count / count
        }
    }

    private def haveAllTheEnhcants(otherEnchs: Map[Int, Int]) = !otherEnchs.exists(p => enchants.getOrElse(p._1, -1) < p._2)

    override def toString = count match {
        case 1 => rawName
        case _ => rawName + "*" + count
    }
}

object Slot {
    def fromItemStack(stack: ItemStack, rawName: String) = {
        val id = stack.getType.getId
        val durability = stack.getDurability
        val count = stack.getAmount
        val enchs = stack.getEnchantments.map(p => p._1.getId -> p._2.toInt).toMap
        Slot(id, durability, count, enchs, rawName)
    }
}