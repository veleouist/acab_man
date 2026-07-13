const MOVE_INTERVAL_SECONDS = 0.24;
const POWER_DURATION_SECONDS = 7;
const DIRECTION_OFFSETS = {
  up: { column: 0, row: -1 },
  down: { column: 0, row: 1 },
  left: { column: -1, row: 0 },
  right: { column: 1, row: 0 },
};
const OPPOSITE_DIRECTIONS = { up: "down", down: "up", left: "right", right: "left" };

/** A maze enemy with a lightweight, deterministic pursuit/patrol behaviour. */
export class Enemy {
  constructor({ column, row, spriteUrl, behaviour, patrolPoints = [] }) {
    this.spawnColumn = column;
    this.spawnRow = row;
    this.column = column;
    this.row = row;
    this.behaviour = behaviour;
    this.patrolPoints = patrolPoints;
    this.patrolPointIndex = 0;
    this.direction = null;
    this.moveElapsed = 0;
    this.vulnerableTimeRemaining = 0;
    this.vulnerableSprite = null;
    this.speedMultiplier = 1;
    this.sprite = new Image();
    this.sprite.src = spriteUrl;
  }

  reset() {
    this.column = this.spawnColumn;
    this.row = this.spawnRow;
    this.direction = null;
    this.moveElapsed = 0;
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
    this.moveElapsed += elapsedSeconds;

    const moveInterval = MOVE_INTERVAL_SECONDS / this.speedMultiplier;
    while (this.moveElapsed >= moveInterval) {
      this.moveElapsed -= moveInterval;
      this.direction = this.chooseDirection(maze, player);
      if (!this.direction) continue;

      const nextPosition = maze.getNextPosition(this.column, this.row, this.direction);
      this.column = nextPosition.column;
      this.row = nextPosition.row;
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

  draw(context, maze) {
    const center = maze.getTileCenter(this.column, this.row);
    if (!center || !maze.bounds) return;

    const size = maze.bounds.tileSize * 0.9;
    const x = center.x - size / 2;
    const y = center.y - size / 2;

    if (this.sprite.complete && this.sprite.naturalWidth > 0) {
      const sprite = this.isVulnerable() ? this.getVulnerableSprite() : this.sprite;
      context.drawImage(sprite, x, y, size, size);
      return;
    }

    context.fillStyle = this.isVulnerable() ? "#3b82f6" : "#6b7280";
    context.beginPath();
    context.arc(center.x, center.y, size / 2, 0, Math.PI * 2);
    context.fill();
  }

  getVulnerableSprite() {
    if (this.vulnerableSprite) return this.vulnerableSprite;

    const canvas = document.createElement("canvas");
    canvas.width = this.sprite.naturalWidth;
    canvas.height = this.sprite.naturalHeight;
    const tintContext = canvas.getContext("2d");

    // The transparent temporary canvas limits source-atop to the sprite alpha,
    // avoiding the rectangular tint produced on the already-painted game canvas.
    tintContext.drawImage(this.sprite, 0, 0);
    tintContext.globalCompositeOperation = "source-atop";
    tintContext.fillStyle = "rgba(59, 130, 246, 0.68)";
    tintContext.fillRect(0, 0, canvas.width, canvas.height);
    this.vulnerableSprite = canvas;
    return this.vulnerableSprite;
  }
}
