import { getSmoothTileCenter } from "./SmoothMovement.js?v=23";

// 0.264 seconds is nine percent slower than the previous 0.24-second pace.
const MOVE_INTERVAL_SECONDS = 0.264;
const POWER_DURATION_SECONDS = 7;
const DIRECTION_OFFSETS = {
  up: { column: 0, row: -1 },
  down: { column: 0, row: 1 },
  left: { column: -1, row: 0 },
  right: { column: 1, row: 0 },
};
const OPPOSITE_DIRECTIONS = { up: "down", down: "up", left: "right", right: "left" };

/** A maze enemy with smooth movement and deterministic pursuit/patrol behaviour. */
export class Enemy {
  constructor({ column, row, spriteUrl, behaviour, patrolPoints = [], tintColor = null }) {
    this.spawnColumn = column;
    this.spawnRow = row;
    this.behaviour = behaviour;
    this.patrolPoints = patrolPoints;
    this.tintColor = tintColor;
    this.vulnerableSprite = null;
    this.tintedSprite = null;
    this.speedMultiplier = 1;
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
    this.moveElapsed = 0;
    this.isMoving = false;
    this.patrolPointIndex = 0;
    this.vulnerableTimeRemaining = 0;
  }

  makeVulnerable() {
    this.vulnerableTimeRemaining = POWER_DURATION_SECONDS;
  }

  setSpeedMultiplier(multiplier) {
    this.speedMultiplier = Math.max(1, multiplier);
  }

  isVulnerable() {
    return this.vulnerableTimeRemaining > 0;
  }

  update(elapsedSeconds, maze, player) {
    this.vulnerableTimeRemaining = Math.max(0, this.vulnerableTimeRemaining - elapsedSeconds);

    const moveInterval = MOVE_INTERVAL_SECONDS / this.speedMultiplier;
    let timeRemaining = elapsedSeconds;

    while (timeRemaining > 0) {
      if (!this.isMoving) {
        this.moveElapsed = 0;
        this.direction = this.chooseDirection(maze, player);
        if (!this.direction) break;

        const nextPosition = maze.getNextPosition(this.column, this.row, this.direction);
        if (!nextPosition) break;

        this.fromColumn = this.column;
        this.fromRow = this.row;
        this.targetColumn = nextPosition.column;
        this.targetRow = nextPosition.row;
        this.isMoving = true;
      }

      const timeToNextTile = moveInterval - this.moveElapsed;
      const step = Math.min(timeRemaining, timeToNextTile);
      this.moveElapsed += step;
      timeRemaining -= step;

      if (this.moveElapsed + Number.EPSILON < moveInterval) break;

      this.column = this.targetColumn;
      this.row = this.targetRow;
      this.moveElapsed = 0;
      this.isMoving = false;
      this.advancePatrolPoint();
    }
  }

  chooseDirection(maze, player) {
    const legalDirections = Object.keys(DIRECTION_OFFSETS).filter((direction) =>
      maze.canMove(this.column, this.row, direction),
    );
    if (!legalDirections.length) return null;

    // Avoid an immediate U-turn where another corridor is available.
    const reverseDirection = OPPOSITE_DIRECTIONS[this.direction];
    const candidates = legalDirections.filter((direction) => direction !== reverseDirection);
    const directions = candidates.length ? candidates : legalDirections;
    const target = this.getTarget(player);

    return directions.reduce((bestDirection, direction) => {
      const bestDistance = this.distanceAfterMove(bestDirection, target, maze);
      const candidateDistance = this.distanceAfterMove(direction, target, maze);
      return candidateDistance < bestDistance ? direction : bestDirection;
    });
  }

  getTarget(player) {
    if (this.behaviour === "patrol" && this.patrolPoints.length) {
      return this.patrolPoints[this.patrolPointIndex];
    }

    if (this.behaviour === "intercept") {
      const offset = DIRECTION_OFFSETS[player.direction] ?? DIRECTION_OFFSETS.up;
      return {
        column: player.column + offset.column * 3,
        row: player.row + offset.row * 3,
      };
    }

    return { column: player.column, row: player.row };
  }

  advancePatrolPoint() {
    const target = this.patrolPoints[this.patrolPointIndex];
    if (!target || this.column !== target.column || this.row !== target.row) return;
    this.patrolPointIndex = (this.patrolPointIndex + 1) % this.patrolPoints.length;
  }

  distanceAfterMove(direction, target, maze) {
    const nextPosition = maze.getNextPosition(this.column, this.row, direction);
    return Math.abs(nextPosition.column - target.column) + Math.abs(nextPosition.row - target.row);
  }

  getRenderCenter(maze) {
    return getSmoothTileCenter(maze, this, MOVE_INTERVAL_SECONDS / this.speedMultiplier);
  }

  draw(context, maze) {
    const center = this.getRenderCenter(maze);
    if (!center || !maze.bounds) return;

    const width = maze.bounds.tileWidth * 0.92;
    const height = maze.bounds.tileHeight * 0.72;
    const x = center.x - width / 2;
    const y = center.y - height / 2;

    if (this.sprite.complete && this.sprite.naturalWidth > 0) {
      const sprite = this.isVulnerable() ? this.getVulnerableSprite() : this.getTintedSprite();
      context.drawImage(sprite, x, y, width, height);
      return;
    }

    context.fillStyle = this.isVulnerable() ? "#3b82f6" : this.tintColor ?? "#6b7280";
    context.beginPath();
    context.ellipse(center.x, center.y, width / 2, height / 2, 0, 0, Math.PI * 2);
    context.fill();
  }

  getVulnerableSprite() {
    if (this.vulnerableSprite) return this.vulnerableSprite;

    this.vulnerableSprite = this.createTintedSprite("rgba(59, 130, 246, 0.68)");
    return this.vulnerableSprite;
  }

  getTintedSprite() {
    if (!this.tintColor) return this.sprite;
    if (this.tintedSprite) return this.tintedSprite;

    this.tintedSprite = this.createTintedSprite(this.tintColor);
    return this.tintedSprite;
  }

  createTintedSprite(tintColor) {
    const canvas = document.createElement("canvas");
    canvas.width = this.sprite.naturalWidth;
    canvas.height = this.sprite.naturalHeight;
    const tintContext = canvas.getContext("2d");

    // The transparent temporary canvas limits source-atop to the sprite alpha,
    // avoiding the rectangular tint produced on the already-painted game canvas.
    tintContext.drawImage(this.sprite, 0, 0);
    tintContext.globalCompositeOperation = "source-atop";
    tintContext.fillStyle = tintColor;
    tintContext.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }
}
