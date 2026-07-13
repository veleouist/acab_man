const RESPAWN_DELAY_SECONDS = 1.25;
const PLAYFIELD_ASPECT_RATIO = 9 / 16;

/**
 * The central game loop. Future scenes can use this class without coupling
 * gameplay rules to browser events.
 */
export class Game {
  constructor(canvas, statusElement, maze, input, player, enemies, onRoundStateChange = () => {}, background = null, powerPickups = [], sound = null, haptics = null) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.statusElement = statusElement;
    this.maze = maze;
    this.input = input;
    this.player = player;
    this.enemies = enemies;
    this.onRoundStateChange = onRoundStateChange;
    this.background = background;
    this.powerPickups = powerPickups;
    this.sound = sound;
    this.haptics = haptics;
    this.gameOverLogo = new Image();
    this.gameOverLogo.src = "./assets/images/GAME_OVER.png";
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.isLevelComplete = false;
    this.isGameOver = false;
    this.isPaused = false;
    this.respawnTimeRemaining = 0;
    this.lastFrameTime = 0;
    this.isRunning = false;
    this.viewportWidth = null;
    this.viewportHeight = null;

    this.resize = this.resize.bind(this);
    this.handleResize = () => this.resize();
    this.handleOrientationChange = () => this.resize(true);
    this.handleFullscreenChange = () => this.resize(true);
    this.frame = this.frame.bind(this);

    this.preparePowerPickups();
    this.setLevelDifficulty();
    // The player begins on a valid pellet tile, so it counts immediately.
    this.collectPelletAtPlayer();
    if (!this.isLevelComplete && !this.isGameOver) this.notifyRoundStateChange("playing");
  }

  start() {
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("orientationchange", this.handleOrientationChange);
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    this.resize(true);
    this.isRunning = true;
    this.input.setActive(true);
    this.sound?.startGameplayMusic();
    requestAnimationFrame(this.frame);
  }

  restart() {
    this.maze.reset();
    this.player.reset();
    this.enemies.forEach((enemy) => enemy.reset());
    this.powerPickups.forEach((pickup) => pickup.reset());
    this.preparePowerPickups();
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.isLevelComplete = false;
    this.isGameOver = false;
    this.isPaused = false;
    this.respawnTimeRemaining = 0;
    this.input.setActive(true);
    this.setLevelDifficulty();
    this.collectPelletAtPlayer();
    this.sound?.startGameplayMusic();
    this.statusElement.textContent = "New round - escape the patrol.";
    this.notifyRoundStateChange("playing");
  }

  advanceLevel() {
    if (!this.isLevelComplete) return false;

    this.level += 1;
    this.maze.reset();
    this.player.reset();
    this.enemies.forEach((enemy) => enemy.reset());
    this.powerPickups.forEach((pickup) => pickup.reset());
    this.preparePowerPickups();
    this.isLevelComplete = false;
    this.isGameOver = false;
    this.isPaused = false;
    this.respawnTimeRemaining = 0;
    this.input.setActive(true);
    this.setLevelDifficulty();
    this.collectPelletAtPlayer();
    this.sound?.startGameplayMusic();
    this.statusElement.textContent = `Level ${this.level} - MAT movement speed increased.`;
    this.notifyRoundStateChange("playing");
    return true;
  }

  togglePause() {
    if (this.isLevelComplete || this.isGameOver) return false;

    this.isPaused = !this.isPaused;
    this.input.setActive(!this.isPaused);
    this.sound?.setGameplayMusicPaused(this.isPaused);
    this.statusElement.textContent = this.isPaused ? "Game paused." : "Game resumed.";
    this.notifyRoundStateChange(this.isPaused ? "paused" : "playing");
    return this.isPaused;
  }

  resize(force = false) {
    // Ignore height-only resize events from mobile browser chrome. The canvas
    // updates only when the width/orientation actually changes.
    const viewportWidth = window.innerWidth;
    if (!force && viewportWidth === this.viewportWidth) return;

    this.viewportWidth = viewportWidth;
    this.viewportHeight = window.innerHeight;
    const maximumWidth = Math.min(viewportWidth - 16, 480);
    const maximumHeight = Math.min(this.viewportHeight * 0.9, 820);
    const width = Math.floor(Math.min(maximumWidth, maximumHeight * PLAYFIELD_ASPECT_RATIO));
    const height = Math.floor(width / PLAYFIELD_ASPECT_RATIO);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(width * pixelRatio);
    this.canvas.height = Math.floor(height * pixelRatio);
    this.canvas.style.aspectRatio = `${width} / ${height}`;
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.width = width;
    this.height = height;
  }

  frame(timestamp) {
    const elapsedSeconds = Math.min((timestamp - this.lastFrameTime) / 1000 || 0, 0.1);
    this.lastFrameTime = timestamp;

    this.update(elapsedSeconds);
    this.render();

    if (this.isRunning) requestAnimationFrame(this.frame);
  }

  update(elapsedSeconds) {
    if (this.isLevelComplete || this.isGameOver || this.isPaused) return;

    if (this.respawnTimeRemaining > 0) {
      this.input.consumeDirection();
      this.respawnTimeRemaining = Math.max(0, this.respawnTimeRemaining - elapsedSeconds);
      if (this.respawnTimeRemaining === 0) {
        this.sound?.setGameplayMusicPaused(false);
        this.statusElement.textContent = "Go!";
      }
      return;
    }

    const direction = this.input.consumeDirection();
    if (direction) this.statusElement.textContent = `Moving ${direction} - swipe on the game screen or use arrow keys/WASD.`;
    const previousColumn = this.player.column;
    const previousRow = this.player.row;
    const playerArrivedAtTile = this.player.update(elapsedSeconds, this.maze, direction);

    if (playerArrivedAtTile) {
      this.collectPelletAtPlayer();
      this.collectPowerPickupAtPlayer();
    }

    if (this.isLevelComplete) return;

    const enemyPreviousPositions = this.enemies.map((enemy) => ({
      column: enemy.column,
      row: enemy.row,
    }));
    this.enemies.forEach((enemy) => enemy.update(elapsedSeconds, this.maze, this.player));
    this.checkEnemyCollision(previousColumn, previousRow, enemyPreviousPositions);
  }

  checkEnemyCollision(previousPlayerColumn, previousPlayerRow, enemyPreviousPositions) {
    const collidingEnemies = this.enemies.filter((enemy, index) => {
      const previousEnemy = enemyPreviousPositions[index];
      const sharingTile = enemy.column === this.player.column && enemy.row === this.player.row;
      const crossedPaths =
        enemy.column === previousPlayerColumn &&
        enemy.row === previousPlayerRow &&
        previousEnemy.column === this.player.column &&
        previousEnemy.row === this.player.row;
      return sharingTile || crossedPaths;
    });

    if (!collidingEnemies.length) return;

    const dangerousEnemies = collidingEnemies.filter((enemy) => !enemy.isVulnerable());
    if (!dangerousEnemies.length) {
      let bonus = 200;
      collidingEnemies.forEach((enemy) => {
        enemy.reset();
        this.score += bonus;
        bonus *= 2;
      });
      this.sound?.playEnemyClear();
      this.haptics?.playEnemyClear();
      this.statusElement.textContent = `Enemy cleared! Score: ${this.score}`;
      return;
    }

    this.lives -= 1;
    if (this.lives === 0) {
      this.finishRound("lost", "Game over - start another round when you are ready.");
      return;
    }

    this.player.reset();
    this.enemies.forEach((enemy) => enemy.reset());
    this.respawnTimeRemaining = RESPAWN_DELAY_SECONDS;
    this.sound?.setGameplayMusicPaused(true);
    this.sound?.playCaught();
    this.haptics?.playCaught();
    this.statusElement.textContent = `Caught! ${this.lives} lives remaining.`;
  }

  collectPelletAtPlayer() {
    if (!this.maze.collectPellet(this.player.column, this.player.row)) return;

    this.score += 10;
    this.sound?.playPellet();
    if (this.getRemainingCollectibles() === 0) {
      this.finishRound("won", "Square cleared! Start another round when you are ready.");
    }
  }

  collectPowerPickupAtPlayer() {
    const pickup = this.powerPickups.find((powerPickup) =>
      powerPickup.collectAt(this.player.column, this.player.row),
    );
    if (!pickup) return;

    this.score += 50;
    this.enemies.forEach((enemy) => enemy.makeVulnerable());
    this.sound?.playPower();
    this.haptics?.playPower();
    this.statusElement.textContent = "Power active! Vulnerable enemies can be cleared.";

    if (this.getRemainingCollectibles() === 0) {
      this.finishRound("won", "Square cleared! Start another round when you are ready.");
    }
  }

  preparePowerPickups() {
    this.powerPickups.forEach((pickup) => this.maze.removePellet(pickup.column, pickup.row));
  }

  getRemainingCollectibles() {
    return this.maze.pelletsRemaining + this.powerPickups.filter((pickup) => pickup.active).length;
  }

  finishRound(result, message) {
    this.isLevelComplete = result === "won";
    this.isGameOver = result === "lost";
    this.input.setActive(false);
    this.sound?.stopGameplayMusic();
    if (result === "won") this.sound?.playWin();
    if (result === "lost") this.sound?.playGameOver();
    if (result === "won") this.haptics?.playWin();
    if (result === "lost") this.haptics?.playGameOver();
    this.statusElement.textContent = message;
    this.notifyRoundStateChange(result);
  }

  setLevelDifficulty() {
    const enemySpeedMultiplier = 1 + (this.level - 1) * 0.08;
    this.enemies.forEach((enemy) => enemy.setSpeedMultiplier(enemySpeedMultiplier));
  }

  notifyRoundStateChange(state) {
    this.onRoundStateChange({ state, score: this.score, lives: this.lives, level: this.level });
  }

  render() {
    const { context, width, height } = this;
    context.clearRect(0, 0, width, height);

    if (this.background) {
      this.background.draw(context, { x: 0, y: 0, width, height });
    } else {
      context.fillStyle = "#172033";
      context.fillRect(0, 0, width, height);
    }

    const headerHeight = 56;
    context.fillStyle = "#dbeafe";
    context.font = "600 13px system-ui, sans-serif";
    context.textAlign = "left";
    context.fillText(`Score: ${this.score}`, 14, 32);
    context.textAlign = "center";
    context.fillText(`Level: ${this.level} · Lives: ${this.lives}`, width / 2, 32);
    context.textAlign = "right";
    context.fillText(`Pellets: ${this.getRemainingCollectibles()}`, width - 14, 32);
    this.maze.draw(context, { x: 12, y: headerHeight, width: width - 24, height: height - headerHeight - 12 });
    this.powerPickups.forEach((pickup) => pickup.draw(context, this.maze));
    this.player.draw(context, this.maze);
    this.enemies.forEach((enemy) => enemy.draw(context, this.maze));

    if (this.isLevelComplete) this.drawRoundOverlay(`LEVEL ${this.level} CLEARED`, "#fff2b5");
    if (this.isGameOver) this.drawRoundOverlay("GAME OVER", "#fecaca", `Final score: ${this.score}`, this.gameOverLogo);
    if (this.isPaused) this.drawRoundOverlay("PAUSED", "#dbeafe");
    if (this.respawnTimeRemaining > 0) {
      this.drawRoundOverlay("GET READY", "#fff2b5", `Respawning in ${Math.ceil(this.respawnTimeRemaining)}`);
    }
  }

  drawRoundOverlay(title, color, subtitle = `Final score: ${this.score}`, titleLogo = null) {
    const { context, width, height } = this;
    context.fillStyle = "rgba(8, 15, 28, 0.78)";
    context.fillRect(0, 0, width, height);

    const titleY = height / 2;
    if (titleLogo?.complete && titleLogo.naturalWidth > 0) {
      const maximumWidth = Math.min(width * 0.92, 420);
      const maximumHeight = height * 0.27;
      const logoAspectRatio = titleLogo.naturalWidth / titleLogo.naturalHeight;
      const logoWidth = Math.min(maximumWidth, maximumHeight * logoAspectRatio);
      const logoHeight = logoWidth / logoAspectRatio;

      context.drawImage(titleLogo, width / 2 - logoWidth / 2, titleY - logoHeight / 2, logoWidth, logoHeight);
      context.fillStyle = color;
      context.font = "600 16px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(subtitle, width / 2, titleY + logoHeight / 2 + 30);
      return;
    }

    context.fillStyle = color;
    context.font = "700 28px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(title, width / 2, titleY);
    context.font = "600 16px system-ui, sans-serif";
    context.fillText(subtitle, width / 2, titleY + 30);
  }
}
