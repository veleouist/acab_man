/**
 * Small wrapper around the Vibration API. Browsers without haptic support
 * quietly ignore these calls, so gameplay remains identical everywhere.
 */
export class HapticsController {
  constructor() {
    this.isEnabled = true;
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) this.cancel();
    return this.isEnabled;
  }

  cancel() {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(0);
  }

  pulse(pattern) {
    if (!this.isEnabled || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
    return navigator.vibrate(pattern);
  }

  playPower() {
    this.pulse(30);
  }

  playEnemyClear() {
    this.pulse([18, 25, 30]);
  }

  playCaught() {
    this.pulse(100);
  }

  playWin() {
    this.pulse([25, 45, 65]);
  }

  playGameOver() {
    this.pulse([90, 60, 150]);
  }
}
