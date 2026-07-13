// Quick mobile turns should register from a small but deliberate finger flick.
const SWIPE_DISTANCE = 12;

/** Collects intent without coupling keyboard or touch events to game entities. */
export class InputController {
  constructor(inputTarget) {
    this.latestDirection = null;
    this.startPoint = null;
    this.isActive = false;

    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    inputTarget.addEventListener("pointerdown", (event) => this.handlePointerDown(event));
    window.addEventListener("pointerup", (event) => this.handlePointerUp(event));
    window.addEventListener("pointercancel", () => {
      this.startPoint = null;
    });
  }

  setActive(isActive) {
    this.isActive = isActive;
    if (!isActive) this.startPoint = null;
  }

  consumeDirection() {
    const direction = this.latestDirection;
    this.latestDirection = null;
    return direction;
  }

  handleKeyDown(event) {
    if (!this.isActive) return;

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
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const direction = keyDirections[key];
    if (!direction) return;

    event.preventDefault();
    this.latestDirection = direction;
  }

  handlePointerDown(event) {
    if (!this.isActive || event.target?.closest?.("button")) return;
    this.startPoint = { x: event.clientX, y: event.clientY };
  }

  handlePointerUp(event) {
    if (!this.isActive || !this.startPoint) return;

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
