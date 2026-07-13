import { Game } from "./game/Game.js?v=26";
import { Background } from "./game/Background.js";
import { Enemy } from "./game/Enemy.js?v=23";
import { InputController } from "./game/InputController.js?v=28";
import { HapticsController } from "./game/HapticsController.js?v=19";
import { LeaderboardController } from "./game/LeaderboardController.js?v=25";
import { Maze } from "./game/Maze.js";
import { Player } from "./game/Player.js?v=23";
import { PowerPickup } from "./game/PowerPickup.js";
import { SoundController } from "./game/SoundController.js?v=26";

const canvas = document.querySelector("#game-canvas");
const statusElement = document.querySelector("#status");
const introScreen = document.querySelector("#intro-screen");
const titleScreen = document.querySelector("#title-screen");
const playerScreen = document.querySelector("#player-screen");
const playerForm = document.querySelector("#player-form");
const playerNameInput = document.querySelector("#player-name");
const playerLeaderboardList = document.querySelector("#player-leaderboard-list");
const playerLeaderboardMessage = document.querySelector("#player-leaderboard-message");
const optionsToggle = document.querySelector("#options-toggle");
const optionsPanel = document.querySelector("#options-panel");
const restartButton = document.querySelector("#restart-button");
const pauseButton = document.querySelector("#pause-button");
const soundButton = document.querySelector("#sound-button");
const hapticsButton = document.querySelector("#haptics-button");
const leaderboardButton = document.querySelector("#leaderboard-button");
const leaderboardOverlay = document.querySelector("#leaderboard-overlay");
const leaderboardClose = document.querySelector("#leaderboard-close");
const gameLeaderboardList = document.querySelector("#game-leaderboard-list");
const gameLeaderboardMessage = document.querySelector("#game-leaderboard-message");

const PLAYER_NAME_STORAGE_KEY = "acab-man-player-name";
const leaderboard = new LeaderboardController({
  projectUrl: "https://paozmfodblditjvmkfzf.supabase.co",
  publishableKey: "sb_publishable_WXPj9Vje9LqYifhEj4YwVw_iH6M0jua",
});

const maze = new Maze();
const input = new InputController(document.body);
const background = new Background("./assets/images/SQUARE.png");
const sound = new SoundController();
const haptics = new HapticsController();
let playerName = loadStoredPlayerName();
const player = new Player({ column: 7, row: 13, spriteUrl: "./assets/images/ACAB_MAN.png" });
const powerPickups = [
  new PowerPickup({ column: 1, row: 1, spriteUrl: "./assets/images/COCKTAIL.png" }),
  new PowerPickup({ column: 13, row: 1, spriteUrl: "./assets/images/COCKTAIL.png" }),
  new PowerPickup({ column: 1, row: 13, spriteUrl: "./assets/images/COCKTAIL.png" }),
  new PowerPickup({ column: 13, row: 13, spriteUrl: "./assets/images/COCKTAIL.png" }),
];
const enemies = [
  new Enemy({ column: 5, row: 7, spriteUrl: "./assets/images/PIGLETS.png", behaviour: "chase", tintColor: "rgba(250, 204, 21, 0.48)" }),
  new Enemy({ column: 6, row: 7, spriteUrl: "./assets/images/PIGLETS.png", behaviour: "intercept", tintColor: "rgba(244, 114, 182, 0.48)" }),
  new Enemy({
    column: 8,
    row: 7,
    spriteUrl: "./assets/images/PIGLETS.png",
    behaviour: "patrol",
    tintColor: "rgba(163, 230, 53, 0.48)",
    patrolPoints: [
      { column: 5, row: 7 },
      { column: 9, row: 7 },
    ],
  }),
  new Enemy({ column: 9, row: 7, spriteUrl: "./assets/images/PIGLETS.png", behaviour: "chase", tintColor: "rgba(196, 181, 253, 0.52)" }),
];
const game = new Game(canvas, statusElement, maze, input, player, enemies, updateRoundControls, background, powerPickups, sound, haptics);

statusElement.textContent = "Escape the patrol — swipe on the game screen to move.";
playerNameInput.value = playerName;

restartButton.addEventListener("click", () => {
  if (game.isLevelComplete) game.advanceLevel();
  else game.restart();
});
pauseButton.addEventListener("click", () => game.togglePause());
soundButton.addEventListener("click", () => {
  const isMuted = sound.toggleMute();
  soundButton.textContent = isMuted ? "Sound: off" : "Sound: on";
  if (!isMuted) sound.unlock();
});
hapticsButton.addEventListener("click", () => {
  const isEnabled = haptics.toggle();
  hapticsButton.textContent = isEnabled ? "Vibe: on" : "Vibe: off";
});
optionsToggle.addEventListener("click", () => setOptionsOpen(optionsPanel.hidden));
leaderboardButton.addEventListener("click", showLeaderboardOverlay);
leaderboardClose.addEventListener("click", hideLeaderboardOverlay);
playerForm.addEventListener("submit", handlePlayerSubmit);
playerNameInput.addEventListener("input", () => playerNameInput.setCustomValidity(""));
window.addEventListener("pointerdown", () => sound.unlock());
window.addEventListener("keydown", (event) => {
  sound.unlock();
  if (event.key === "Escape" && !leaderboardOverlay.hidden) hideLeaderboardOverlay();
});

introScreen.addEventListener("pointerdown", () => {
  void dismissIntro();
}, { once: true });
introScreen.addEventListener("keydown", handleIntroKey);
titleScreen.addEventListener("pointerdown", () => {
  showPlayerSetup();
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

function showPlayerSetup() {
  titleScreen.removeEventListener("keydown", handleTitleKey);
  titleScreen.classList.add("is-fading-out");

  window.setTimeout(() => {
    titleScreen.hidden = true;
    playerScreen.hidden = false;
    playerNameInput.focus();
    void refreshLeaderboards();
  }, 350);
}

function startGame() {
  if (hasStarted) return;
  hasStarted = true;
  requestGameFullscreen();
  void sound.unlock();
  sound.stopTitleMusic();
  playerScreen.classList.add("is-fading-out");

  window.setTimeout(() => {
    playerScreen.hidden = true;
    optionsToggle.hidden = false;
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
  showPlayerSetup();
}

function handlePlayerSubmit(event) {
  event.preventDefault();
  const name = playerNameInput.value.trim().replace(/\s+/g, " ");
  if (!name) {
    playerNameInput.setCustomValidity("Enter a name for the leaderboard.");
    playerNameInput.reportValidity();
    return;
  }

  playerName = name.slice(0, 16);
  playerNameInput.value = playerName;
  savePlayerName(playerName);
  startGame();
}

function updateRoundControls({ state, score, level }) {
  const isRoundOver = state === "won" || state === "lost";
  restartButton.hidden = !isRoundOver;
  pauseButton.disabled = isRoundOver;
  pauseButton.textContent = state === "paused" ? "Resume" : "Pause";
  if (isRoundOver) {
    restartButton.textContent = state === "won" ? `Level ${level + 1} — score ${score}` : "Restart from Level 1";
  }
  if (state === "lost") void submitScore(score, level);
}

async function refreshLeaderboards() {
  setLeaderboardMessage("Loading leaderboard…");
  try {
    const scores = await leaderboard.getTopScores();
    renderLeaderboard(playerLeaderboardList, scores);
    renderLeaderboard(gameLeaderboardList, scores);
    setLeaderboardMessage(scores.length ? "" : "No scores yet — set the first one.");
  } catch {
    setLeaderboardMessage("Leaderboard is temporarily unavailable.");
  }
}

async function submitScore(score, level) {
  if (!playerName) return;

  try {
    await leaderboard.submitScore({ playerName, score, level });
    await refreshLeaderboards();
  } catch {
    // The game remains playable when a connection is unavailable.
  }
}

function renderLeaderboard(list, scores) {
  list.replaceChildren();
  if (!scores.length) return;

  const numberFormatter = new Intl.NumberFormat();
  scores.forEach((entry) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const score = document.createElement("span");
    name.textContent = entry.player_name;
    score.textContent = `${numberFormatter.format(entry.score)} · L${entry.level}`;
    item.append(name, score);
    list.append(item);
  });
}

function setLeaderboardMessage(message) {
  playerLeaderboardMessage.textContent = message;
  gameLeaderboardMessage.textContent = message;
}

function showLeaderboardOverlay() {
  setOptionsOpen(false);
  leaderboardOverlay.hidden = false;
  leaderboardClose.focus();
  void refreshLeaderboards();
}

function hideLeaderboardOverlay() {
  leaderboardOverlay.hidden = true;
  optionsToggle.focus();
}

function loadStoredPlayerName() {
  try {
    return (localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "").trim().replace(/\s+/g, " ").slice(0, 16);
  } catch {
    return "";
  }
}

function savePlayerName(name) {
  try {
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
  } catch {
    // Saving the preferred name is an optional convenience.
  }
}

function setOptionsOpen(isOpen) {
  optionsPanel.hidden = !isOpen;
  optionsToggle.setAttribute("aria-expanded", String(isOpen));
}

function requestGameFullscreen() {
  if (document.fullscreenElement) return;

  const requestFullscreen = document.documentElement.requestFullscreen ?? document.documentElement.webkitRequestFullscreen;
  if (typeof requestFullscreen !== "function") return;
  const fullscreenResult = requestFullscreen.call(document.documentElement, { navigationUI: "hide" });
  if (fullscreenResult && typeof fullscreenResult.catch === "function") fullscreenResult.catch(() => {});
}
