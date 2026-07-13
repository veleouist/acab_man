// Legend: # = wall, . = pellet, space = open floor.
// This original layout intentionally does not recreate any licensed maze design.
const MAZE_LAYOUT = [
  "###############",
  "#.............#",
  "#.###.###.###.#",
  "#.#.........#.#",
  "#.#.##.#.##.#.#",
  "#.....#.#.....#",
  "###.#.#.#.#.###",
  " ...#     #... ",
  "#.### ### ###.#",
  "#.....#.#.....#",
  "#.###.#.#.###.#",
  "#...#.....#...#",
  "###.#.###.#.###",
  "#.............#",
  "###############",
];

const DIRECTION_OFFSETS = {
  up: { column: 0, row: -1 },
  down: { column: 0, row: 1 },
  left: { column: -1, row: 0 },
  right: { column: 1, row: 0 },
};

export class Maze {
  constructor() {
    this.columns = MAZE_LAYOUT[0].length;
    this.rowCount = MAZE_LAYOUT.length;
    this.reset();
  }

  reset() {
    this.rows = MAZE_LAYOUT.map((row) => [...row]);
    this.pelletsRemaining = this.rows.flat().filter((tile) => tile === ".").length;

    if (this.rows.some((row) => row.length !== this.columns)) {
      throw new Error("Every maze row must have the same number of tiles.");
    }
  }

  canMove(column, row, direction) {
    const nextPosition = this.getNextPosition(column, row, direction);
    return Boolean(nextPosition && !this.isWall(nextPosition.column, nextPosition.row));
  }

  getNextPosition(column, row, direction) {
    const offset = DIRECTION_OFFSETS[direction];
    if (!offset) return null;

    let nextColumn = column + offset.column;
    const nextRow = row + offset.row;
    if (nextColumn < 0 || nextColumn >= this.columns) {
      if (!this.isTunnelRow(row) || direction === "up" || direction === "down") return null;
      nextColumn = nextColumn < 0 ? this.columns - 1 : 0;
    }

    if (nextRow < 0 || nextRow >= this.rowCount) return null;
    return { column: nextColumn, row: nextRow };
  }

  isTunnelRow(row) {
    return this.rows[row]?.[0] !== "#" && this.rows[row]?.[this.columns - 1] !== "#";
  }

  isWall(column, row) {
    if (row < 0 || row >= this.rowCount || column < 0 || column >= this.columns) return true;
    return this.rows[row][column] === "#";
  }

  collectPellet(column, row) {
    return this.removePellet(column, row);
  }

  removePellet(column, row) {
    if (this.rows[row]?.[column] !== ".") return false;

    this.rows[row][column] = " ";
    this.pelletsRemaining -= 1;
    return true;
  }

  getTileCenter(column, row) {
    if (!this.bounds) return null;
    const { x, y, tileSize } = this.bounds;
    return {
      x: x + (column + 0.5) * tileSize,
      y: y + (row + 0.5) * tileSize,
    };
  }

  draw(context, playArea) {
    const tileSize = Math.floor(
      Math.min(playArea.width / this.columns, playArea.height / this.rowCount),
    );
    const width = tileSize * this.columns;
    const height = tileSize * this.rowCount;
    const x = playArea.x + (playArea.width - width) / 2;
    const y = playArea.y + (playArea.height - height) / 2;

    this.bounds = { x, y, width, height, tileSize };

    for (let row = 0; row < this.rowCount; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        const tileX = x + column * tileSize;
        const tileY = y + row * tileSize;
        const value = this.rows[row][column];

        if (value === "#") {
          context.fillStyle = "#365bd6";
          context.fillRect(tileX, tileY, tileSize, tileSize);
          context.fillStyle = "#4979ff";
          context.fillRect(tileX + 2, tileY + 2, tileSize - 4, tileSize - 4);
        } else if (value === ".") {
          context.fillStyle = "#fff2b5";
          context.beginPath();
          context.arc(tileX + tileSize / 2, tileY + tileSize / 2, Math.max(2, tileSize * 0.1), 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }
}
