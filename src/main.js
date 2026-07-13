import { Game } from "./game/Game.js";
import { Background } from "./game/Background.js";
import { Enemy } from "./game/Enemy.js";
import { InputController } from "./game/InputController.js";
import { Maze } from "./game/Maze.js";
import { Player } from "./game/Player.js";
import { PowerPickup } from "./game/PowerPickup.js";
import { SoundController } from "./game/SoundController.js?v=14";

const canvas = document.querySelector("#game-canvas");
const statusElement = document.querySelector("#status");
const introScreen = document.querySelector("#intro-screen");
const titleScreen = document.querySelector("#title-screen");
const restartButton = document.querySelector("#restart-button");
const pauseButton = document.querySelector("#pause-button");
const soundButton = document.querySelector("#sound-button");

const maze = new Maze();
const input = new InputController(canvas);
const background = new Background("./SQUARE.png");
const sound = new SoundController();
const player = new Player({ column: 7, row: 13, spriteUrl: "./ACAB_MAN.png" });
const powerPickups = [
  new PowerPickup({ column: 1, row: 1, spriteUrl: "./COCKTAIL.png" }),
  new PowerPickup({ column: 13, row: 1, spriteUrl: "./COCKTAIL.png" }),
  new PowerPickup({ column: 1, row: 13, spriteUrl: "./COCKTAIL.png" }),
  new PowerPickup({ column: 13, row: 13, spriteUrl: "./COCKTAIL.png" }),
];
const enemies = [
  new Enemy({ column: 5, row: 7, spriteUrl: "./PIGLETS.png", behaviour: "chase", tintColor: "rgba(250, 204, 21, 0.48)" }),
  new Enemy({ column: 6, row: 7, spriteUrl: "./PIGLETS.png", behaviour: "intercept", tintColor: "rgba(244, 114, 182, 0.48)" }),
  new Enemy({
    column: 8,
    row: 7,
    spriteUrl: "./PIGLETS.png",
    behaviour: "patrol",
    tintColor: "rgba(163, 230, 53, 0.48)",
    patrolPoints: [
      { column: 5, row: 7 },
      { column: 9, row: 7 },
    ],
  }),
  new Enemy({ column: 9, row: 7, spriteUrl: "./PIGLETS.png", behaviour: "chase", tintColor: "rgba(196, 181, 253, 0.52)" }),
];
const game = new Game(canvas, statusElement, maze, input, player, enemies, updateRoundControls, background, powerPickups, sound);

statusElement.textContent = "Escape the patrol — swipe on the game screen to move.";

restartButton.addEventListener("click", () => {
  if (game.isLevelComplete) game.advanceLevel();
  else game.restart();
});
pauseButton.addEventListener("click", () => game.togglePause());
soundButton.addEventListener("click", () => {
  const isMuted = sound.toggleMute();
  soundButton.textContent = isMuted ? "Sound off" : "Sound on";
  if (!isMuted) sound.unlock();
});
window.addEventListener("pointerdown", () => sound.unlock());
window.addEventListener("keydown", () => sound.unlock());

introScreen.addEventListener("pointerdown", () => {
  void dismissIntro();
}, { once: true });
introScreen.addEventListener("keydown", handleIntroKey);
titleScreen.addEventListener("pointerdown", () => {
  void startGame();
}, { once: true });
titleScreen.addEventListener("keydown", handleTitleKey);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The game remains playable when service workers are unavailable.
    });
  });
}

let introDismissed = false;
let hasStarted = false;

async function dismissIntro() {
  if (introDismissed) return;
  introDismissed = true;
  introScreen.removeEventListener("keydown", handleIntroKey);
  void sound.unlock().then(() => sound.playIntro()).catch(() => {});
  sound.queueTitleMusic();
  introScreen.classList.add("is-fading-out");

  window.setTimeout(() => {
    introScreen.hidden = true;
    titleScreen.hidden = false;
    sound.revealTitleMusic();
    titleScreen.focus();
  }, 450);
}

async function startGame() {
  if (hasStarted) return;
  hasStarted = true;
  titleScreen.removeEventListener("keydown", handleTitleKey);
  void sound.unlock();
  sound.stopTitleMusic();
  titleScreen.classList.add("is-fading-out");

  window.setTimeout(() => {
    titleScreen.hidden = true;
    game.start();
  }, 350);
}

function handleIntroKey(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  void dismissIntro();
}

function handleTitleKey(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  void startGame();
}

function updateRoundControls({ state, score, level }) {
  const isRoundOver = state === "won" || state === "lost";
  restartButton.hidden = !isRoundOver;
  pauseButton.disabled = isRoundOver;
  pauseButton.textContent = state === "paused" ? "Resume" : "Pause";
  if (isRoundOver) {
    restartButton.textContent = state === "won" ? `Level ${level + 1} — score ${score}` : "Restart from Level 1";
  }
}
