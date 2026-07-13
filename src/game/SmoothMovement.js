/**
 * Converts a grid movement in progress into a smooth canvas position.
 * Entities still use whole tiles for maze rules and collisions.
 */
export function getSmoothTileCenter(maze, entity, moveInterval) {
  const settledCenter = maze.getTileCenter(entity.column, entity.row);
  if (!settledCenter || !entity.isMoving) return settledCenter;

  const fromCenter = maze.getTileCenter(entity.fromColumn, entity.fromRow);
  if (!fromCenter) return settledCenter;

  const progress = Math.min(1, entity.moveElapsed / moveInterval);
  const crossesTunnel = entity.fromRow === entity.targetRow && Math.abs(entity.targetColumn - entity.fromColumn) > 1;

  if (crossesTunnel && maze.bounds) {
    const distance = entity.direction === "left" ? -maze.bounds.tileWidth : maze.bounds.tileWidth;
    return { x: fromCenter.x + distance * progress, y: fromCenter.y };
  }

  const targetCenter = maze.getTileCenter(entity.targetColumn, entity.targetRow);
  if (!targetCenter) return fromCenter;

  return {
    x: fromCenter.x + (targetCenter.x - fromCenter.x) * progress,
    y: fromCenter.y + (targetCenter.y - fromCenter.y) * progress,
  };
}
