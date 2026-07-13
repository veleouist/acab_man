import { getSmoothTileCenter } from "./SmoothMovement.js?v=23";

const MOVE_INTERVAL_SECONDS = 0.12;

/**
 * A grid-aligned player keeps collision predictable while rendering each
 * movement as a smooth journey between the two tile centers.
 */
export class Player {
  constructor({ column, row, spriteUrl }) {
    this.spawnColumn = column;
    this.spawnRow = row;
    this.sprite = new Image();
    this.sprite.src = spriteUrl;
    this.reset();
  }

  reset() {
    this.column = this.spawnColumn;
    this.row = this.spawnRow;
    this.fromColumn = this.column;
    this.fromRow = this.row;
    this.targetColumn = this.column;
    this.targetRow = this.row;
    this.direction = null;
    this.queuedDirection = null;
    this.moveElapsed = 0;
    this.isMoving = false;
  }

  update(elapsedSeconds, maze, requestedDirection) {
    if (requestedDirection) this.queuedDirection = requestedDirection;

    let timeRemaining = elapsedSeconds;
    let arrivedAtTile = false;

    while (timeRemaining > 0) {
      if (!this.isMoving) {
        this.moveElapsed = 0;

        // A new requested direction has priority at intersections.
        if (this.queuedDirection && maze.canMove(this.column, this.row, this.queuedDirection)) {
          this.direction = this.queuedDirection;
        }

        if (!this.direction || !maze.canMove(this.column, this.row, this.direction)) {
          this.direction = null;
          break;
        }

        const nextPosition = maze.getNextPosition(this.column, this.row, this.direction);
        if (!nextPosition) break;

        this.fromColumn = this.column;
        this.fromRow = this.row;
        this.targetColumn = nextPosition.column;
        this.targetRow = nextPosition.row;
        this.isMoving = true;
      }

      const timeToNextTile = MOVE_INTERVAL_SECONDS - this.moveElapsed;
      const step = Math.min(timeRemaining, timeToNextTile);
      this.moveElapsed += step;
      timeRemaining -= step;

      if (this.moveElapsed + Number.EPSILON < MOVE_INTERVAL_SECONDS) break;

      this.column = this.targetColumn;
      this.row = this.targetRow;
      this.moveElapsed = 0;
      this.isMoving = false;
      arrivedAtTile = true;
    }

    return arrivedAtTile;
  }

  getRenderCenter(maze) {
    return getSmoothTileCenter(maze, this, MOVE_INTERVAL_SECONDS);
  }

  draw(context, maze) {
    const center = this.getRenderCenter(maze);
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
