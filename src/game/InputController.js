const SWIPE_DISTANCE = 28;

/** Collects intent without coupling keyboard or touch events to game entities. */
export class InputController {
  constructor(canvas) {
    this.latestDirection = null;
    this.startPoint = null;

    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    canvas.addEventListener("pointerdown", (event) => this.handlePointerDown(event));
    canvas.addEventListener("pointerup", (event) => this.handlePointerUp(event));
    canvas.addEventListener("pointercancel", () => {
      this.startPoint = null;
    });
  }

  consumeDirection() {
    const direction = this.latestDirection;
    this.latestDirection = null;
    return direction;
  }

  handleKeyDown(event) {
    const keyDirections = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
    };
    const direction = keyDirections[event.key];
    if (!direction) return;

    event.preventDefault();
    this.latestDirection = direction;
  }

  handlePointerDown(event) {
    this.startPoint = { x: event.clientX, y: event.clientY };
  }

  handlePointerUp(event) {
    if (!this.startPoint) return;

    const horizontal = event.clientX - this.startPoint.x;
    const vertical = event.clientY - this.startPoint.y;
    this.startPoint = null;

    if (Math.max(Math.abs(horizontal), Math.abs(vertical)) < SWIPE_DISTANCE) return;

    if (Math.abs(horizontal) > Math.abs(vertical)) {
      this.latestDirection = horizontal > 0 ? "right" : "left";
    } else {
      this.latestDirection = vertical > 0 ? "down" : "up";
    }
  }
}
