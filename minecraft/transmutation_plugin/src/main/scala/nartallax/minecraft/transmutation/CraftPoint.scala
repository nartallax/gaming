package nartallax.minecraft.transmutation

case class CraftPoint(x: Int, y: Int, recipe: Recipe, count: Long){

    def height = recipe.height
    def width = recipe.width

    def top = y
    def bottom = top + height - 1

    def left = x
    def right = left + width - 1

    def eachPoint(body: (Int, Int, Option[Slot]) => Unit, startX: Int = left): Unit = {
        if(startX <= right){
            eachPointAtCol(body, startX)
            eachPoint(body, startX + 1)
        }
    }

    private def eachPointAtCol(body: (Int, Int, Option[Slot]) => Unit, col: Int, startY: Int = top): Unit = {
        if(startY <= bottom){
            body(col, startY, recipe.at(col - left, startY - top))
            eachPointAtCol(body, col, startY + 1)
        }
    }

}
