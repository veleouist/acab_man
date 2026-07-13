const MOVE_INTERVAL_SECONDS = 0.12;

/**
 * A grid-aligned player keeps collision predictable and makes future enemy
 * pathfinding use the exact same maze coordinates.
 */
export class Player {
  constructor({ column, row, spriteUrl }) {
    this.spawnColumn = column;
    this.spawnRow = row;
    this.column = column;
    this.row = row;
    this.direction = null;
    this.queuedDirection = null;
    this.moveElapsed = 0;
    this.sprite = new Image();
    this.sprite.src = spriteUrl;
  }

  reset() {
    this.column = this.spawnColumn;
    this.row = this.spawnRow;
    this.direction = null;
    this.queuedDirection = null;
    this.moveElapsed = 0;
  }

  update(elapsedSeconds, maze, requestedDirection) {
    if (requestedDirection) this.queuedDirection = requestedDirection;
    this.moveElapsed += elapsedSeconds;

    while (this.moveElapsed >= MOVE_INTERVAL_SECONDS) {
      this.moveElapsed -= MOVE_INTERVAL_SECONDS;

      // A new requested direction has priority, allowing turns at intersections.
      if (this.queuedDirection && maze.canMove(this.column, this.row, this.queuedDirection)) {
        this.direction = this.queuedDirection;
      }

      if (!this.direction || !maze.canMove(this.column, this.row, this.direction)) {
        this.direction = null;
        continue;
      }

      const nextPosition = maze.getNextPosition(this.column, this.row, this.direction);
      this.column = nextPosition.column;
      this.row = nextPosition.row;
    }
  }

  draw(context, maze) {
    const center = maze.getTileCenter(this.column, this.row);
    if (!center || !maze.bounds) return;

    const width = maze.bounds.tileWidth * 0.92;
    const height = maze.bounds.tileHeight * 0.74;
    const x = center.x - width / 2;
    const y = center.y - height / 2;

    if (this.sprite.complete && this.sprite.naturalWidth > 0) {
      context.drawImage(this.sprite, x, y, width, height);
      return;
    }

    // Visible fallback while the supplied sprite is still loading.
    context.fillStyle = "#111111";
    context.beginPath();
    context.ellipse(center.x, center.y, width / 2, height / 2, 0, 0, Math.PI * 2);
    context.fill();
  }
}
