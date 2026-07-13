const TITLE_MUSIC_VOLUME = 0.28;
const GAMEPLAY_STEP_MILLISECONDS = 125;
// An original off-kilter chiptune hook: playful, fast, and maze-chase friendly.
const GAMEPLAY_MELODY = [
  659, null, 784, 1047, 880, null, 784, null,
  659, 587, null, 523, 659, null, 587, null,
  784, null, 988, 880, 1047, null, 880, null,
  784, 659, 587, null, 523, 587, 659, null,
];
const GAMEPLAY_BASS = [147, 147, 196, 196, 165, 165, 220, 196];

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
    this.gameplayMusicTimer = null;
    this.gameplayMusicStep = 0;
    this.isGameplayMusicPaused = false;
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

  startGameplayMusic() {
    if (this.gameplayMusicTimer !== null) return;

    this.gameplayMusicStep = 0;
    this.isGameplayMusicPaused = false;
    this.playGameplayStep();
    this.gameplayMusicTimer = window.setInterval(() => this.playGameplayStep(), GAMEPLAY_STEP_MILLISECONDS);
  }

  setGameplayMusicPaused(isPaused) {
    this.isGameplayMusicPaused = isPaused;
  }

  stopGameplayMusic() {
    if (this.gameplayMusicTimer === null) return;

    window.clearInterval(this.gameplayMusicTimer);
    this.gameplayMusicTimer = null;
    this.gameplayMusicStep = 0;
    this.isGameplayMusicPaused = false;
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
    // A quick descending phrase marks a lost life without sounding gloomy.
    this.playChiptune([880, 784, 659, 523], { step: 0.09, duration: 0.08, type: "square", volume: 0.052 });
    this.playTone({ frequency: 147, endFrequency: 73, duration: 0.42, type: "triangle", volume: 0.045 });
  }

  playWin() {
    this.playTone({ frequency: 740, duration: 0.3, type: "triangle", volume: 0.07 });
  }

  playGameOver() {
    // A longer, lower ending phrase makes the final loss unmistakable.
    this.playChiptune([523, 466, 392, 294, 196], { step: 0.135, duration: 0.12, type: "square", volume: 0.06 });
    this.playTone({ frequency: 131, endFrequency: 55, duration: 0.78, type: "triangle", volume: 0.055 });
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

  playChiptune(notes, { step, duration, type, volume }) {
    notes.forEach((frequency, index) => {
      if (!frequency) return;
      this.playTone({ frequency, duration, type, volume, startDelay: index * step });
    });
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

  playGameplayStep() {
    if (this.isGameplayMusicPaused) return;

    const step = this.gameplayMusicStep;
    const melodyNote = GAMEPLAY_MELODY[step];
    if (melodyNote) {
      this.playTone({ frequency: melodyNote, duration: 0.09, type: "square", volume: 0.024 });
    }

    if (step % 4 === 0) {
      const bassNote = GAMEPLAY_BASS[(step / 4) % GAMEPLAY_BASS.length];
      this.playTone({ frequency: bassNote, duration: 0.18, type: "triangle", volume: 0.035 });
      this.playTone({ frequency: 110, endFrequency: 55, duration: 0.065, type: "square", volume: 0.022 });
    } else if (step % 4 === 2) {
      this.playTone({ frequency: 1320, endFrequency: 1040, duration: 0.03, type: "square", volume: 0.014 });
    }

    this.gameplayMusicStep = (step + 1) % GAMEPLAY_MELODY.length;
  }
}
