package nartallax.minecraft.transmutation

import org.bukkit.Material
import org.bukkit.inventory.{ItemStack, Inventory}

case class InventoryWrap(inner: Inventory) {

    def each[T](body: (Int, Int, Option[ItemStack]) => T, startRow: Int = 0): List[T] = {
        startRow >= Config.inventory.height match {
            case true => List()
            case false => eachCellAtRow(body, startRow) ::: each(body, startRow + 1)
        }
    }

    def eachCellAtRow[T](body: (Int, Int, Option[ItemStack]) => T, row: Int, startCol: Int = 0): List[T] = {
        startCol >= Config.inventory.width match {
            case true => List()
            case false => body(startCol, row, at(startCol, row)) :: eachCellAtRow(body, row, startCol + 1)
        }
    }

    def at(x: Int, y: Int): Option[ItemStack] = {
        coordsInBounds(x, y) match {
            case false => None
            case true => inner.getItem(cellNumberAt(x, y)) match {
                case null => None
                case s: ItemStack => Some(s)
            }
        }
    }

    def setAt(x: Int, y: Int, items: ItemStack) = inner.setItem(cellNumberAt(x: Int, y: Int), items)

    def removeAt(x: Int, y: Int, count: Long) = {
        at(x, y) match {
            case None =>
            case Some(stack) =>
                stack.getAmount > count match {
                    case true =>
                        stack.setAmount(stack.getAmount - count.toInt)
                        setAt(x, y, stack)
                    case false =>
                        setAt(x, y, new ItemStack(Material.AIR))
                }
        }
    }

    def cellNumberAt(x: Int, y: Int): Int = {
        coordsInBounds(x, y) match {
            case true => (y * Config.inventory.width) + x + Config.inventory.offset
            case false => throw new Exception("Incorrect cell coordinates requested: " + x + ", " + y)
        }
    }

    def coordsInBounds(x: Int, y: Int) = x >= 0 && x < Config.inventory.width && y >= 0 && y < Config.inventory.height
}
