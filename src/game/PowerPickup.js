/** A collectible that temporarily makes enemies vulnerable. */
export class PowerPickup {
  constructor({ column, row, spriteUrl }) {
    this.column = column;
    this.row = row;
    this.active = true;
    this.sprite = new Image();
    this.sprite.src = spriteUrl;
  }

  collectAt(column, row) {
    if (!this.active || this.column !== column || this.row !== row) return false;
    this.active = false;
    return true;
  }

  reset() {
    this.active = true;
  }

  draw(context, maze) {
    if (!this.active) return;
    const center = maze.getTileCenter(this.column, this.row);
    if (!center || !maze.bounds) return;

    const size = maze.bounds.tileSize * 0.94;
    const x = center.x - size / 2;
    const y = center.y - size / 2;

    if (this.sprite.complete && this.sprite.naturalWidth > 0) {
      context.drawImage(this.sprite, x, y, size, size);
      return;
    }

    context.fillStyle = "#a3e635";
    context.beginPath();
    context.arc(center.x, center.y, size * 0.28, 0, Math.PI * 2);
    context.fill();
  }
}
