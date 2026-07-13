const TITLE_MUSIC_VOLUME = 0.28;

/** Lightweight synthesized feedback plus title music. */
export class SoundController {
  constructor() {
    this.context = null;
    this.isMuted = false;
    this.titleMusic = new Audio("./TITLE_MUSIC.mp3");
    this.titleMusic.loop = true;
    this.titleMusic.preload = "auto";
    this.titleMusic.volume = 0;
    this.titleFadeFrame = null;
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
    this.titleMusic.muted = this.isMuted;
    return this.isMuted;
  }

  queueTitleMusic() {
    if (this.isMuted) return;

    this.cancelTitleFade();
    this.titleMusic.pause();
    this.titleMusic.currentTime = 0;
    this.titleMusic.volume = 0;
    const playback = this.titleMusic.play();
    if (playback) playback.catch(() => {});
  }

  revealTitleMusic() {
    if (this.isMuted) return;
    this.fadeTitleMusicTo(TITLE_MUSIC_VOLUME, 220);
  }

  stopTitleMusic() {
    this.fadeTitleMusicTo(0, 350, () => {
      this.titleMusic.pause();
      this.titleMusic.currentTime = 0;
    });
  }

  playPellet() {
    this.playTone({ frequency: 720, endFrequency: 980, duration: 0.055, type: "square", volume: 0.045 });
  }

  playPower() {
    this.playTone({ frequency: 190, endFrequency: 680, duration: 0.32, type: "sawtooth", volume: 0.075 });
    this.playTone({ frequency: 820, endFrequency: 1240, duration: 0.18, type: "triangle", volume: 0.06, startDelay: 0.14 });
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

  playTone({ frequency, endFrequency = frequency, duration, type, volume, startDelay = 0 }) {
    if (this.isMuted || !this.context || this.context.state !== "running") return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime + startDelay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  fadeTitleMusicTo(targetVolume, duration, onComplete = () => {}) {
    this.cancelTitleFade();
    const startingVolume = this.titleMusic.volume;
    const startedAt = performance.now();

    const animate = (timestamp) => {
      const progress = Math.min(1, (timestamp - startedAt) / duration);
      this.titleMusic.volume = startingVolume + (targetVolume - startingVolume) * progress;
      if (progress < 1) {
        this.titleFadeFrame = requestAnimationFrame(animate);
        return;
      }

      this.titleFadeFrame = null;
      onComplete();
    };

    this.titleFadeFrame = requestAnimationFrame(animate);
  }

  cancelTitleFade() {
    if (this.titleFadeFrame === null) return;
    cancelAnimationFrame(this.titleFadeFrame);
    this.titleFadeFrame = null;
  }
}
