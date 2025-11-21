// ====================================
// AUDIO MANAGER CLASS
// Manages all game sounds with overlap control
// ====================================

class AudioManager {
  constructor() {
    // Audio paths
    this.sounds = {
      bgm: 'b.MP3',      // Background music
      spawn: 'sp.mp3',   // Object spawn sound
      warning: 'w.mp3',  // Near collision warning
      collision: 'go.mp3', // Collision/Game Over
      victory: 'win.mp3',  // Victory sound
      button: 'ping.mp3',  // Button click
    };

    // Audio elements
    this.bgmAudio = null;
    this.currentAudio = null;

    // Cooldown tracking for warning sound
    this.warningCooldown = 0;
    this.warningCooldownDuration = 500; // ms

    this.init();
  }

  /**
   * Initialize audio elements with error handling
   */
  init() {
    try {
      // Create background music audio element
      this.bgmAudio = new Audio(this.sounds.bgm);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.4; // Moderate background music volume
      this.bgmAudio.preload = 'auto';

      // Fallback if BGM fails to load
      this.bgmAudio.onerror = () => {
        console.warn('Failed to load background music:', this.sounds.bgm);
      };
    } catch (error) {
      console.warn('AudioManager init error:', error);
    }
  }

  /**
   * Play background music (loops continuously)
   * Fades from full volume
   */
  playBGM() {
    try {
      if (this.bgmAudio && this.bgmAudio.paused) {
        this.bgmAudio.currentTime = 0;
        this.bgmAudio.volume = 0.4;
        this.bgmAudio.play().catch(err => {
          console.warn('BGM playback failed:', err);
        });
      }
    } catch (error) {
      console.warn('playBGM error:', error);
    }
  }

  /**
   * Stop background music (used for game over/victory)
   */
  stopBGM() {
    try {
      if (this.bgmAudio && !this.bgmAudio.paused) {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      }
    } catch (error) {
      console.warn('stopBGM error:', error);
    }
  }

  /**
   * Fade BGM volume (for game over/victory)
   */
  fadeBGM(targetVolume = 0.1, duration = 500) {
    try {
      if (!this.bgmAudio) return;

      const startVolume = this.bgmAudio.volume;
      const startTime = Date.now();

      const fadeFn = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        this.bgmAudio.volume = startVolume + (targetVolume - startVolume) * progress;

        if (progress < 1) {
          requestAnimationFrame(fadeFn);
        }
      };

      fadeFn();
    } catch (error) {
      console.warn('fadeBGM error:', error);
    }
  }

  /**
   * Play object spawn sound (sp.mp3)
   * Low volume, no cooldown needed as spawns are infrequent
   */
  playSpawnSound() {
    try {
      const audio = new Audio(this.sounds.spawn);
      audio.volume = 0.3; // Low volume for spawn
      audio.play().catch(err => {
        // Silently fail - common in some browsers
      });
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Play warning sound (w.mp3) with cooldown to prevent spam
   * Only plays if character is very close to falling object (< 70px)
   */
  playWarningSound() {
    try {
      const now = Date.now();

      // Only play if cooldown has expired
      if (now - this.warningCooldown >= this.warningCooldownDuration) {
        const audio = new Audio(this.sounds.warning);
        audio.volume = 0.4;
        audio.play().catch(err => {
          // Silently fail
        });

        this.warningCooldown = now; // Reset cooldown timer
      }
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Play collision sound (go.mp3) - triggered on actual collision
   * Stops BGM and plays game over sound
   */
  playCollisionSound() {
    try {
      // Stop BGM immediately
      this.stopBGM();

      // Play collision sound
      const audio = new Audio(this.sounds.collision);
      audio.volume = 0.7;
      audio.play().catch(err => {
        // Silently fail
      });
    } catch (error) {
      console.warn('playCollisionSound error:', error);
    }
  }

  /**
   * Play victory sound (win.mp3) - triggered when player wins
   * Stops BGM and plays victory sound
   */
  playVictorySound() {
    try {
      // Stop BGM immediately
      this.stopBGM();

      // Play victory sound
      const audio = new Audio(this.sounds.victory);
      audio.volume = 0.7;
      audio.play().catch(err => {
        // Silently fail
      });
    } catch (error) {
      console.warn('playVictorySound error:', error);
    }
  }

  /**
   * Play button click sound (ping.mp3)
   * Used for all UI button interactions
   */
  playButtonSound() {
    try {
      const audio = new Audio(this.sounds.button);
      audio.volume = 0.5;
      audio.play().catch(err => {
        // Silently fail
      });
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Reset audio state (useful when stopping game)
   */
  reset() {
    try {
      this.stopBGM();
      this.warningCooldown = 0;
    } catch (error) {
      console.warn('reset error:', error);
    }
  }
}

// ====================================
// GAME INITIALIZATION
// ====================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Audio Manager
  const audioManager = new AudioManager();
  // DOM Elements
  const gameBoard = document.getElementById('gameBoard');
  const timerDisplay = document.getElementById('timer');
  const scoreDisplay = document.getElementById('score');
  const overlay = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMessage = document.getElementById('overlayMessage');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');

  // ==========================================
  // GAME CONFIGURATION
  // ==========================================
  const GAME_WIDTH = gameBoard.offsetWidth;
  const GAME_HEIGHT = gameBoard.offsetHeight;
  const GAME_DURATION = 44; // seconds - total game length
  const CHARACTER_WIDTH = 60;
  const CHARACTER_HEIGHT = 70;
  const FALLING_OBJECT_SIZE = 50;
  const MOVE_SPEED = 8; // pixels per frame

  // Difficulty curve configuration
  // Objects start slow and gradually increase speed
  const DIFFICULTY_CURVE = {
    baseSpeed: 2.5, // Minimum speed (0-5 seconds, very easy)
    maxSpeed: 6.5,  // Maximum speed (reached around 40s)
    difficultyCheckpoints: [
      { time: 0, speedMultiplier: 1.0 },      // 0-5s: x1.0 speed (very easy)
      { time: 5, speedMultiplier: 1.15 },     // 5-10s: x1.15 speed
      { time: 10, speedMultiplier: 1.35 },    // 10-15s: x1.35 speed
      { time: 15, speedMultiplier: 1.60 },    // 15-20s: x1.60 speed (moderate)
      { time: 20, speedMultiplier: 1.90 },    // 20-30s: x1.90 speed
      { time: 30, speedMultiplier: 2.25 },    // 30-35s: x2.25 speed
      { time: 35, speedMultiplier: 3.20 },    // 35-40s: x3.20 speed (hard)
      { time: 40, speedMultiplier: 3.80 },    // 40-44s: x3.80 speed (very hard)
    ],
    spawnRateCheckpoints: [
      { time: 0, spawnRate: 90 },              // 0-5s: Spawn every 90 frames
      { time: 5, spawnRate: 80 },              // 5-10s: Spawn every 80 frames
      { time: 10, spawnRate: 70 },             // 10-15s: Spawn every 70 frames
      { time: 15, spawnRate: 60 },             // 15-20s: Spawn every 60 frames
      { time: 20, spawnRate: 50 },             // 20-25s: Spawn every 50 frames
      { time: 25, spawnRate: 45 },             // 25-30s: Spawn every 45 frames
      { time: 30, spawnRate: 40 },             // 30-35s: Spawn every 40 frames
      { time: 35, spawnRate: 40 },             // 35-40s: Spawn every 40 frames
      { time: 40, spawnRate: 30 },             // 40-44s: Spawn every 30 frames
    ],
  };

  // Stress objects (emoji and text descriptions)
  const stressObjects = [
    { emoji: '📚', label: 'exam' },
    { emoji: '☕', label: 'coffee' },
    { emoji: '✏️', label: 'pencil' },
    { emoji: '👨‍🏫', label: 'teacher' },
    { emoji: '⏰', label: 'deadline' },
    { emoji: '😰', label: 'stress' },
    { emoji: '⏲️', label: 'alarm' },
    { emoji: '💻', label: 'computer' },
    { emoji: '🌭', label: 'hotdog' },
    { emoji: '🪑', label: 'desk' },
  ];

  // ==========================================
  // GAME STATE
  // ==========================================
  let gameState = 'idle'; // 'idle', 'playing', 'gameOver', 'victory'
  let score = 0;
  let timeLeft = GAME_DURATION;
  let elapsedTime = 0; // Track how much time has passed
  let gameLoopId = null;
  let spawnCounter = 0;
  let currentSpawnRate = 90; // Start with easy spawn rate
  let currentSpeedMultiplier = 1.0; // Start with easy speed
  let lastTime = 0;
  // Character state
  const character = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 100,
    width: CHARACTER_WIDTH,
    height: CHARACTER_HEIGHT,
    moving: 'none', // 'left', 'right', 'none'
    element: null,
  };

  // Falling objects array
  let fallingObjects = [];

  // ==========================================
  // DIFFICULTY CURVE FUNCTIONS
  // ==========================================

  /**
   * Get the current speed multiplier based on elapsed time
   * Provides smooth progression from easy to hard
   */
  function getSpeedMultiplier(elapsed) {
    // Find the appropriate checkpoint for this time
    let multiplier = 1.0;
    for (let i = 0; i < DIFFICULTY_CURVE.difficultyCheckpoints.length; i++) {
      const checkpoint = DIFFICULTY_CURVE.difficultyCheckpoints[i];
      const nextCheckpoint = DIFFICULTY_CURVE.difficultyCheckpoints[i + 1];

      if (elapsed >= checkpoint.time) {
        if (nextCheckpoint && elapsed < nextCheckpoint.time) {
          // Linear interpolation between checkpoints for smooth progression
          const timeInRange = elapsed - checkpoint.time;
          const rangeDuration = nextCheckpoint.time - checkpoint.time;
          const progress = timeInRange / rangeDuration;
          const multiplierDiff = nextCheckpoint.speedMultiplier - checkpoint.speedMultiplier;
          multiplier = checkpoint.speedMultiplier + (multiplierDiff * progress);
          break;
        } else if (!nextCheckpoint) {
          // At the last checkpoint
          multiplier = checkpoint.speedMultiplier;
        }
      }
    }
    return multiplier;
  }

  /**
   * Get the current spawn rate based on elapsed time
   * Objects spawn more frequently as difficulty increases
   */
  function getSpawnRate(elapsed) {
    let spawnRate = 90;
    for (let i = 0; i < DIFFICULTY_CURVE.spawnRateCheckpoints.length; i++) {
      const checkpoint = DIFFICULTY_CURVE.spawnRateCheckpoints[i];
      const nextCheckpoint = DIFFICULTY_CURVE.spawnRateCheckpoints[i + 1];

      if (elapsed >= checkpoint.time) {
        if (nextCheckpoint && elapsed < nextCheckpoint.time) {
          // Linear interpolation between checkpoints
          const timeInRange = elapsed - checkpoint.time;
          const rangeDuration = nextCheckpoint.time - checkpoint.time;
          const progress = timeInRange / rangeDuration;
          const rateDiff = nextCheckpoint.spawnRate - checkpoint.spawnRate;
          spawnRate = checkpoint.spawnRate + (rateDiff * progress);
          break;
        } else if (!nextCheckpoint) {
          spawnRate = checkpoint.spawnRate;
        }
      }
    }
    return Math.round(spawnRate);
  }

  // Initialize character element
  function initCharacter() {
  character.element = document.createElement('div');
  character.element.className = 'character';
  character.element.style.backgroundImage = "url('bulldog.png')";
    character.element.style.left = character.x + 'px';
    gameBoard.appendChild(character.element);
  }

  // Update character position
  function updateCharacterPosition() {
    if (character.moving === 'left' && character.x > 0) {
      character.x -= MOVE_SPEED;
    } else if (character.moving === 'right' && character.x + character.width < GAME_WIDTH) {
      character.x += MOVE_SPEED;
    }

    // Giới hạn X để không ra khỏi game board
    character.x = Math.max(0, Math.min(character.x, GAME_WIDTH - character.width));

    const drawX = Math.round(character.x);
    character.element.style.left = drawX + 'px';
  }

  // Create falling object
  function createFallingObject() {
    // Safety check - only create objects during gameplay
    if (gameState !== 'playing') {
      return;
    }

    const stressItem = stressObjects[Math.floor(Math.random() * stressObjects.length)];
    const obj = {
      x: Math.random() * (GAME_WIDTH - FALLING_OBJECT_SIZE),
      y: -FALLING_OBJECT_SIZE,
      width: FALLING_OBJECT_SIZE,
      height: FALLING_OBJECT_SIZE,
      emoji: stressItem.emoji,
      speedMultiplier: currentSpeedMultiplier, // Use current difficulty level
      element: null,
    };

    obj.element = document.createElement('div');
    obj.element.className = 'falling-object';
    obj.element.textContent = obj.emoji;
    obj.element.style.left = obj.x + 'px';
    obj.element.style.top = obj.y + 'px';
    
    // Add to DOM and track
    if (gameBoard) {
      gameBoard.appendChild(obj.element);
      fallingObjects.push(obj);
      
      // Play spawn sound for each new object
      audioManager.playSpawnSound();
    }
  }

  // Update falling objects
  function updateFallingObjects() {
    for (let i = fallingObjects.length - 1; i >= 0; i--) {
      const obj = fallingObjects[i];
      
      // Safety check - ensure object still exists
      if (!obj || !obj.element) {
        fallingObjects.splice(i, 1);
        continue;
      }

      // Move down with current difficulty speed
      // Base speed ranges from 2.5 (easy) to 6.5 (hard)
      const baseSpeed = DIFFICULTY_CURVE.baseSpeed + 
        (DIFFICULTY_CURVE.maxSpeed - DIFFICULTY_CURVE.baseSpeed) * (obj.speedMultiplier - 1);
      obj.y += baseSpeed;

      // Update position
      if (obj.element && obj.element.parentNode) {
        obj.element.style.top = obj.y + 'px';
      }

      // Check if character is close to falling object (< 70px distance for warning)
      const characterCenterX = character.x + character.width / 2;
      const objectCenterX = obj.x + obj.width / 2;
      const characterCenterY = character.y + character.height / 2;
      const objectCenterY = obj.y + obj.height / 2;
      
      const distanceX = Math.abs(characterCenterX - objectCenterX);
      const distanceY = Math.abs(characterCenterY - objectCenterY);
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      // Play warning sound if very close (but not colliding yet)
      if (distance < 70 && !checkCollision(character, obj)) {
        audioManager.playWarningSound();
      }

      // Check collision with character
      if (checkCollision(character, obj)) {
        // Clean up the object before game over
        if (obj.element && obj.element.parentNode) {
          obj.element.remove();
        }
        fallingObjects.splice(i, 1);
        
        // Play collision sound and trigger game over after delay
        audioManager.playCollisionSound();
        
        // Delay game over panel by 500ms to show collision sound
        setTimeout(() => {
          gameOver();
        }, 500);
        
        return;
      }

      // Remove if off screen and award points
      if (obj.y > GAME_HEIGHT) {
        if (obj.element && obj.element.parentNode) {
          obj.element.remove();
        }
        fallingObjects.splice(i, 1);
        score += 10; // Reward for avoiding
      }
    }
  }

  // Check collision
  function checkCollision(char, obj) {
    return (
      char.x < obj.x + obj.width &&
      char.x + char.width > obj.x &&
      char.y < obj.y + obj.height &&
      char.y + char.height > obj.y
    );
  }

  // Update game UI
  function updateUI() {
    timerDisplay.textContent = Math.ceil(timeLeft);
    scoreDisplay.textContent = score;
  }

  // Game over function
  function gameOver() {
    // Prevent multiple gameOver calls
    if (gameState === 'gameOver') {
      return;
    }

    gameState = 'gameOver';
    
    // Stop game loop
    if (gameLoopId !== null && typeof gameLoopId === 'number') {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }

    // Play collision sound (stops BGM internally, shows YOU LOSE after 0.5s delay)
    audioManager.playCollisionSound();

    // Delay showing game over screen by 500ms
    setTimeout(() => {
      // Clean up all falling objects
      fallingObjects.forEach(obj => {
        if (obj.element && obj.element.parentNode) {
          obj.element.remove();
        }
      });
      fallingObjects = [];

      overlayTitle.textContent = '😓 YOU LOSE!';
      overlayMessage.innerHTML = `
        <p style="font-size: 1.2rem; margin: 10px 0;">Final Score: <strong style="color: #BA1010;">${score}</strong></p>
        <p style="font-size: 1rem; margin: 8px 0;">Time Survived: <strong style="color: #F00000;">${(GAME_DURATION - timeLeft).toFixed(1)}s / ${GAME_DURATION}s</strong></p>
        <p style="font-size: 0.9rem; opacity: 0.8;">You couldn't pass the exam this time</p>
      `;

      startBtn.classList.add('hidden');
      restartBtn.classList.remove('hidden');
      overlay.classList.remove('hidden');
    }, 500);
  }

  // Victory function
  function victory() {
    gameState = 'victory';
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;

    // Play victory sound (stops BGM internally)
    audioManager.playVictorySound();

    // Clean up all falling objects
    fallingObjects.forEach(obj => {
      if (obj.element && obj.element.parentNode) {
        obj.element.remove();
      }
    });
    fallingObjects = [];

    overlayTitle.textContent = '🎉 VICTORY!';
    overlayMessage.innerHTML = `
      <p style="font-size: 1.2rem; margin: 10px 0;">Final Score: <strong style="color: #BA1010;">${score}</strong></p>
      <p style="font-size: 1rem; margin: 8px 0;">Time Survived: <strong style="color: #F00000;">44s / 44s</strong></p>
      <p style="font-size: 0.9rem; opacity: 0.8;">You escaped the finals stress! 🐕</p>
    `;

    startBtn.classList.add('hidden');
    restartBtn.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }

  /**
 * Main game loop - runs every frame
 * timestamp = milliseconds since page load (from requestAnimationFrame)
 */
function gameLoop(timestamp) {
  // Khởi tạo lần đầu
  if (!lastTime) {
    lastTime = timestamp;
  }

  // Tính thời gian trôi qua giữa 2 frame (giây)
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (gameState !== 'playing') {
    gameLoopId = requestAnimationFrame(gameLoop);
    return;
  }

  // Cập nhật thời gian dựa theo deltaTime thật
  elapsedTime += deltaTime;
  timeLeft = GAME_DURATION - elapsedTime;

  // Check nếu đã sống đủ 44s
  if (elapsedTime >= GAME_DURATION) {
    victory();
    return;
  }

  // Update độ khó theo elapsedTime
  currentSpeedMultiplier = getSpeedMultiplier(elapsedTime);
  currentSpawnRate = getSpawnRate(elapsedTime);

  // Spawn falling objects theo spawnRate hiện tại
  spawnCounter++;
  if (spawnCounter >= currentSpawnRate) {
    createFallingObject();
    spawnCounter = 0;
  }

  // Update game elements
  updateCharacterPosition();
  updateFallingObjects();
  updateUI();

  // Gọi frame tiếp theo
  gameLoopId = requestAnimationFrame(gameLoop);
}


  // Start game
  function startGame() {
    // Cancel any existing game loop to prevent multiple loops running
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }

    // Reset state
    gameState = 'playing';
    score = 0;
    elapsedTime = 0; // Reset elapsed time counter
    timeLeft = GAME_DURATION;
    spawnCounter = 0;
    currentSpeedMultiplier = 1.0; // Start at easiest difficulty
    currentSpawnRate = 90; // Start with easiest spawn rate
    character.x = GAME_WIDTH / 2;
    character.moving = 'none';
    lastTime = 0; // <-- reset timestamp cho vòng lặp mới

    // Play background music
    audioManager.playBGM();

    // Clear falling objects and remove from DOM
    fallingObjects.forEach(obj => {
      if (obj.element && obj.element.parentNode) {
        obj.element.remove();
      }
    });
    fallingObjects = [];

    // Reset UI
    updateUI();

    // Hide overlay
    overlay.classList.add('hidden');
    startBtn.classList.remove('hidden');
    restartBtn.classList.add('hidden');

    // Start game loop
    gameLoopId = requestAnimationFrame(gameLoop);
  }

  // Reset game
  function resetGame() {
    startGame();
  }

  // Event listeners for keyboard controls
  document.addEventListener('keydown', (e) => {
    if (gameState === 'playing') {
      if (e.key === 'ArrowLeft') {
        character.moving = 'left';
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        character.moving = 'right';
        e.preventDefault();
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      character.moving = 'none';
      e.preventDefault();
    }
  });

  // Start button listener
  startBtn.addEventListener('click', () => {
    audioManager.playButtonSound();
    startGame();
  });
  restartBtn.addEventListener('click', () => {
    audioManager.playButtonSound();
    resetGame();
  });

  // Touch controls for mobile
  let touchStartX = 0;
  gameBoard.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });

  gameBoard.addEventListener('touchmove', (e) => {
    if (gameState !== 'playing') return;

    const touchX = e.touches[0].clientX;
    const diff = touchX - touchStartX;

    if (Math.abs(diff) > 5) {
      character.moving = diff > 0 ? 'right' : 'left';
    }

    e.preventDefault();
  });

  gameBoard.addEventListener('touchend', () => {
    character.moving = 'none';
  });

  // Click controls for desktop (left/right areas)
  gameBoard.addEventListener('click', (e) => {
    if (gameState !== 'playing') return;

    const rect = gameBoard.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const centerX = rect.width / 2;

    if (clickX < centerX) {
      character.moving = 'left';
      setTimeout(() => {
        character.moving = 'none';
      }, 100);
    } else {
      character.moving = 'right';
      setTimeout(() => {
        character.moving = 'none';
      }, 100);
    }
  });

  // Initialize
  initCharacter();
  updateUI();

  // Show initial overlay
  overlayTitle.textContent = '🐕 Avoid the Finals Stress';
  overlayMessage.innerHTML = `
    <p><strong>Get Ready!</strong></p>
    <p style="font-size: 0.95rem; margin-top: 12px;">Use <strong>← →</strong> or click left/right to move your bulldog.</p>
    <p style="font-size: 0.9rem; margin-top: 8px; opacity: 0.8;">Survive 44 seconds to become a CHAMPION! 🏆</p>
  `;
  startBtn.classList.remove('hidden');
  restartBtn.classList.add('hidden');
  overlay.classList.remove('hidden');
});
