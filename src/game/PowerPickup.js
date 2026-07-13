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

    const width = maze.bounds.tileWidth * 0.96;
    const height = maze.bounds.tileHeight * 0.72;
    const x = center.x - width / 2;
    const y = center.y - height / 2;

    if (this.sprite.complete && this.sprite.naturalWidth > 0) {
      context.drawImage(this.sprite, x, y, width, height);
      return;
    }

    context.fillStyle = "#a3e635";
    context.beginPath();
    context.ellipse(center.x, center.y, width * 0.28, height * 0.28, 0, 0, Math.PI * 2);
    context.fill();
  }
}
