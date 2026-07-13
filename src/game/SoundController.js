/** Lightweight synthesized feedback that needs no external audio files. */
export class SoundController {
  constructor() {
    this.context = null;
    this.isMuted = false;
  }

  async unlock() {
    if (this.isMuted) return;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playPellet() {
    this.playTone({ frequency: 620, duration: 0.04, type: "square", volume: 0.025 });
  }

  playPower() {
    this.playTone({ frequency: 210, duration: 0.22, type: "sawtooth", volume: 0.07 });
  }

  playEnemyClear() {
    this.playTone({ frequency: 820, duration: 0.14, type: "triangle", volume: 0.06 });
  }

  playCaught() {
    this.playTone({ frequency: 130, duration: 0.3, type: "sawtooth", volume: 0.07 });
  }

  playWin() {
    this.playTone({ frequency: 740, duration: 0.3, type: "triangle", volume: 0.07 });
  }

  playGameOver() {
    this.playTone({ frequency: 105, duration: 0.42, type: "sawtooth", volume: 0.08 });
  }

  playIntro() {
    this.playTone({ frequency: 1120, duration: 0.2, type: "triangle", volume: 0.07 });
  }

  playTone({ frequency, duration, type, volume }) {
    if (this.isMuted || !this.context || this.context.state !== "running") return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
