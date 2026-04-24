// --- CENTRAL STATE ---
const defaultState = {
  word: "",
  category: "",
  guessedLetters: [],
  wrongCount: 0,
  maxWrong: 6,

  coins: 250,
  level: 1,
  xp: 0,
  combo: 0,

  settings: {
    difficulty: "easy",
    timerEnabled: false,
    soundEnabled: true,
    theme: "light",
    activeColor: "#4834d4",
    ownedColors: ["#4834d4"]
  },

  activeEffects: {
    shield: false
  },

  gameStatus: "menu", // menu, playing, over
  timeLeft: 30,
  timerId: null,

  inventory: { shield: 0, potion: 0 },

  stats: { wins: 0, losses: 0, totalGames: 0, correct: 0, wrong: 0, bestStreak: 0, currentStreak: 0 },
  achievements: [],
  dailyPlayedDate: null
};

let gameState = JSON.parse(JSON.stringify(defaultState));

// --- DATA ---
const localWords = {
  Fruits: ["PINEAPPLE", "AVOCADO", "STRAWBERRY", "BANANA", "ORANGE", "GRAPE", "TOMATO", "WATERMELON", "MANGO", "MELON", "BLUEBERRY", "APPLE", "LEMON", "PEACH", "KIWI", "CHERRY", ""],
  Animals: ["KANGAROO", "PENGUIN", "CROCODILE", "ELEPHANT", "CHEETAH", "BEAR", "BIRD", "DOG", "CAT", "MONKEY", "SNAKE", "HORSE", "WOLF", "FOX", "FROG", "LION", "TIGER", "ZEBRA"],
  Countries: ["UZBEKISTAN", "BRAZIL", "CANADA", "JAPAN", "GERMANY", "RUSSIA", "SPAIN", "ITALY", "USA", "AUSTRALIA", "MEXICO", "CHINA", "TURKEY", "FRANCE", "INDIA", "EGYPT"]
};

const shopData = [
  { id: "#4834d4", name: "Royal", price: 0 }, { id: "#eb4d4b", name: "Crimson", price: 500 },
  { id: "#6ab04c", name: "Forest", price: 500 }, { id: "#f9ca24", name: "Gold", price: 2000 },
  { id: "#22a6b3", name: "Cyan", price: 600 }, { id: "#be2edd", name: "Purple", price: 800 },
  { id: "#2f3542", name: "Coal", price: 400 }, { id: "#ff7f50", name: "Coral", price: 700 }
];

const achievementsData = {
  FIRST_WIN: { title: "First Blood", desc: "Win your first game" },
  WIN_10: { title: "Veteran", desc: "Win 10 games total" },
  PERFECT_GAME: { title: "Flawless", desc: "Win with 0 mistakes" },
  COMBO_5: { title: "On Fire", desc: "Reach a 5x Combo" }
};

// --- AUDIO SYSTEM (Web Audio API - Offline Safe) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const playSound = (type) => {
  if (!gameState.settings.soundEnabled || audioCtx.state === 'suspended') return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  if (type === 'click') { osc.frequency.setValueAtTime(400, now); osc.type = 'sine'; gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
  else if (type === 'correct') { osc.frequency.setValueAtTime(600, now); osc.frequency.setValueAtTime(800, now + 0.1); osc.type = 'square'; gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
  else if (type === 'wrong') { osc.frequency.setValueAtTime(300, now); osc.frequency.setValueAtTime(200, now + 0.1); osc.type = 'sawtooth'; gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
  else if (type === 'win') { osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(500, now + 0.1); osc.frequency.setValueAtTime(600, now + 0.2); osc.type = 'sine'; gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5); osc.start(now); osc.stop(now + 0.5); }
  else if (type === 'lose') { osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(100, now + 0.4); osc.type = 'sawtooth'; gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5); osc.start(now); osc.stop(now + 0.5); }
};

// --- CORE LOGIC ---
const saveState = () => localStorage.setItem("hangmanoid_state", JSON.stringify(gameState));
const loadState = () => {
  try {
    const saved = localStorage.getItem("hangmanoid_state");
    if (saved) {
      const parsed = JSON.parse(saved);
      gameState = { ...defaultState, ...parsed, settings: { ...defaultState.settings, ...parsed.settings }, inventory: { ...defaultState.inventory, ...parsed.inventory }, stats: { ...defaultState.stats, ...parsed.stats }, activeEffects: { shield: false }, gameStatus: "menu" };
    }
  } catch (e) { console.error("Corrupted save data."); }
};

const updateUI = () => {
  document.documentElement.style.setProperty('--accent', gameState.settings.activeColor);
  document.body.className = gameState.settings.theme === 'dark' ? 'dark-theme' : 'light-theme';
  document.getElementById("theme-toggle").checked = gameState.settings.theme === 'dark';
  document.getElementById("sound-toggle").checked = gameState.settings.soundEnabled;
  document.getElementById("ui-timer-toggle").checked = gameState.settings.timerEnabled;
  document.getElementById("ui-difficulty").value = gameState.settings.difficulty;

  document.getElementById("ui-coins").innerText = gameState.coins;
  document.getElementById("ui-level").innerText = gameState.level;
  document.getElementById("ui-xp-bar").style.width = `${gameState.xp}%`;

  document.getElementById("hud-shield").innerText = gameState.inventory.shield;
  document.getElementById("hud-potion").innerText = gameState.inventory.potion;

  const canvas = document.getElementById("canvas");
  if (gameState.activeEffects.shield) canvas.classList.add('shield-active');
  else canvas.classList.remove('shield-active');

  const dailyBtn = document.querySelector(".daily-btn");
  if (gameState.dailyPlayedDate === new Date().toDateString()) dailyBtn.disabled = true;
};

const init = () => {
  loadState();
  updateUI();
  document.addEventListener('click', () => { if (audioCtx.state === 'suspended') audioCtx.resume(); }, { once: true });

  const menu = document.getElementById("category-list");
  menu.innerHTML = "";
  Object.keys(localWords).forEach(cat => {
    let b = document.createElement("button");
    b.className = "category-btn";
    b.innerHTML = `<span>${cat}</span> <i class="fas fa-play"></i>`;
    b.onclick = () => startGame(cat, false);
    menu.appendChild(b);
  });
  renderShop();
  renderStats();
};

const updateSetupState = (key, value) => {
  if (key === 'difficulty') gameState.settings.difficulty = value;
  if (key === 'timer') gameState.settings.timerEnabled = value;
  saveState();
};

// --- API / WORD GENERATOR ---
const fetchWord = async (category, isDaily) => {
  if (isDaily) return localWords["Countries"][new Date().getDate() % localWords["Countries"].length];
  let words = localWords[category];
  const diff = gameState.settings.difficulty;
  let filtered = words;
  if (diff === 'easy') filtered = words.filter(w => w.length <= 6);
  else if (diff === 'medium') filtered = words.filter(w => w.length >= 7 && w.length <= 8);
  else if (diff === 'hard') filtered = words.filter(w => w.length >= 9);

  if (filtered.length === 0) filtered = words; // fallback
  return filtered[Math.floor(Math.random() * filtered.length)];
};

// --- GAMEPLAY LOOP ---
const startGame = async (cat, isDaily) => {
  playSound('click');
  gameState.category = cat;
  gameState.word = await fetchWord(cat, isDaily);
  gameState.guessedLetters = [];
  gameState.wrongCount = 0;
  gameState.combo = 0;
  gameState.gameStatus = "playing";
  gameState.activeEffects.shield = false;

  if (isDaily) gameState.dailyPlayedDate = new Date().toDateString();

  document.getElementById("menu-section").classList.add("hide");
  document.getElementById("game-section").classList.remove("hide");
  document.getElementById("current-category").innerText = isDaily ? "DAILY CHALLENGE" : cat;
  document.getElementById("clue-display").classList.add("hide");

  const comboUI = document.getElementById("ui-combo");
  comboUI.classList.add("hide");
  comboUI.querySelector("span").innerText = "0";

  setupTimer();
  renderKeyboard();
  renderWord();
  drawMan(0);
  updateUI();
  saveState();
};

const renderWord = () => {
  const container = document.getElementById("word-display");
  container.innerHTML = "";
  gameState.word.split("").forEach((char) => {
    const span = document.createElement("span");
    span.className = "dash";
    span.innerText = gameState.guessedLetters.includes(char) ? char : "_";
    container.appendChild(span);
  });
};

const renderKeyboard = () => {
  const kb = document.getElementById("keyboard");
  kb.innerHTML = "";
  const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  rows.forEach(rowStr => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "kb-row";
    rowStr.split("").forEach(char => {
      const btn = document.createElement("button");
      btn.className = "key";
      btn.innerText = char;
      btn.id = "key-" + char;
      if (gameState.guessedLetters.includes(char)) btn.disabled = true;
      btn.onclick = () => handleGuess(char);
      rowDiv.appendChild(btn);
    });
    kb.appendChild(rowDiv);
  });
};

const handleGuess = (char, isSystem = false) => {
  if (gameState.gameStatus !== "playing" || gameState.guessedLetters.includes(char)) return;

  gameState.guessedLetters.push(char);
  const btn = document.getElementById("key-" + char);
  if (btn) btn.disabled = true;

  const isCorrect = gameState.word.includes(char);

  if (isCorrect) {
    playSound('correct');
    if (!isSystem) gameState.combo++;
    gameState.stats.correct++;
    if (!isSystem) document.getElementById("ui-combo").classList.remove("hide");
    document.getElementById("ui-combo").querySelector("span").innerText = gameState.combo;

    // Add XP
    addXP(5);

    // Animate UI
    if (btn) btn.classList.add("anim-correct");
    renderWord();

    // Check Win
    const won = gameState.word.split("").every(l => gameState.guessedLetters.includes(l));
    if (won) handleGameOver(true);

  } else {
    if (gameState.activeEffects.shield) {
      gameState.activeEffects.shield = false;
      showToast("🛡️ Shield blocked mistake!");
      updateUI();
      playSound('correct'); // Positive sound for shield
      return;
    }

    playSound('wrong');
    gameState.combo = 0;
    document.getElementById("ui-combo").classList.add("hide");
    gameState.wrongCount++;
    gameState.stats.wrong++;
    if (btn) btn.classList.add("anim-wrong");
    drawMan(gameState.wrongCount);

    if (gameState.wrongCount >= gameState.maxWrong) handleGameOver(false);
  }

  checkAchievements();
  saveState();
};

const drawMan = (step) => {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 200, 200);
  ctx.strokeStyle = gameState.settings.activeColor;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  ctx.beginPath(); ctx.moveTo(20, 170); ctx.lineTo(150, 170); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, 170); ctx.lineTo(40, 20); ctx.lineTo(120, 20); ctx.lineTo(120, 40); ctx.stroke();
  if (step > 0) { ctx.beginPath(); ctx.arc(120, 60, 20, 0, Math.PI * 2); ctx.stroke(); }
  if (step > 1) { ctx.beginPath(); ctx.moveTo(120, 80); ctx.lineTo(120, 130); ctx.stroke(); }
  if (step > 2) { ctx.beginPath(); ctx.moveTo(120, 90); ctx.lineTo(90, 110); ctx.stroke(); }
  if (step > 3) { ctx.beginPath(); ctx.moveTo(120, 90); ctx.lineTo(150, 110); ctx.stroke(); }
  if (step > 4) { ctx.beginPath(); ctx.moveTo(120, 130); ctx.lineTo(100, 160); ctx.stroke(); }
  if (step > 5) { ctx.beginPath(); ctx.moveTo(120, 130); ctx.lineTo(140, 160); ctx.stroke(); }
};

// --- SYSTEMS: ITEMS & HINTS ---
const useItem = (type) => {
  if (gameState.gameStatus !== "playing" || gameState.inventory[type] <= 0) return;
  playSound('click');
  gameState.inventory[type]--;

  if (type === 'shield') {
    gameState.activeEffects.shield = true;
    showToast("🛡️ Shield Activated!");
  } else if (type === 'potion') {
    revealRandomLetters(2);
    showToast("🧪 Potion: 2 letters revealed!");
  }
  updateUI();
  saveState();
};

const buyHint = (type) => {
  if (gameState.gameStatus !== "playing") return;
  const costs = { reveal: 20, remove: 15, clue: 10 };
  const cost = costs[type];
  if (gameState.coins < cost) return showToast("❌ Not enough coins!");

  let success = false;
  if (type === 'reveal') success = revealRandomLetters(1);
  else if (type === 'remove') success = removeWrongLetters(2);
  else if (type === 'clue') success = showClue();

  if (success) {
    playSound('click');
    gameState.coins -= cost;
    updateUI();
    saveState();
  } else {
    showToast("⚠️ Can't use that right now.");
  }
};

const revealRandomLetters = (amount) => {
  const hidden = gameState.word.split("").filter(l => !gameState.guessedLetters.includes(l));
  const uniqueHidden = [...new Set(hidden)];
  if (uniqueHidden.length === 0) return false;

  for (let i = 0; i < Math.min(amount, uniqueHidden.length); i++) {
    const r = Math.floor(Math.random() * uniqueHidden.length);
    handleGuess(uniqueHidden[r], true);
    uniqueHidden.splice(r, 1);
  }
  return true;
};

const removeWrongLetters = (amount) => {
  const keyboard = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const wrongLetters = keyboard.filter(l => !gameState.word.includes(l) && !gameState.guessedLetters.includes(l));
  if (wrongLetters.length === 0) return false;

  for (let i = 0; i < Math.min(amount, wrongLetters.length); i++) {
    const r = Math.floor(Math.random() * wrongLetters.length);
    const char = wrongLetters[r];
    gameState.guessedLetters.push(char);
    const btn = document.getElementById("key-" + char);
    if (btn) { btn.disabled = true; btn.style.opacity = '0'; }
    wrongLetters.splice(r, 1);
  }
  return true;
};

const showClue = () => {
  const clueDiv = document.getElementById("clue-display");
  if (!clueDiv.classList.contains("hide")) return false; // already showing
  clueDiv.innerText = `Clue: Belongs to ${gameState.category} category. Length: ${gameState.word.length}`;
  clueDiv.classList.remove("hide");
  return true;
};

// --- RPG SYSTEMS ---
const addXP = (amount) => {
  gameState.xp += amount;
  if (gameState.xp >= 100) {
    gameState.level++;
    gameState.xp -= 100;
    gameState.coins += 50;
    showToast(`🎉 Level Up! You are now Lv.${gameState.level} (+50 coins)`);
  }
  updateUI();
};

const checkAchievements = () => {
  const checkAndGrant = (id) => {
    if (!gameState.achievements.includes(id)) {
      gameState.achievements.push(id);
      showToast(`🏆 Achievement: ${achievementsData[id].title}`);
      gameState.coins += 100;
    }
  };

  if (gameState.stats.wins >= 1) checkAndGrant("FIRST_WIN");
  if (gameState.stats.wins >= 10) checkAndGrant("WIN_10");
  if (gameState.combo >= 5) checkAndGrant("COMBO_5");
  if (gameState.gameStatus === "over" && gameState.wrongCount === 0) checkAndGrant("PERFECT_GAME");
};

// --- TIMER SYSTEM ---
const setupTimer = () => {
  clearInterval(gameState.timerId);
  const timerUI = document.getElementById("ui-timer");
  if (!gameState.settings.timerEnabled) {
    timerUI.classList.add("hide");
    return;
  }
  gameState.timeLeft = 30;
  timerUI.classList.remove("hide");
  timerUI.querySelector("span").innerText = gameState.timeLeft;

  gameState.timerId = setInterval(() => {
    // Pause timer if any modal is open
    if (document.querySelector('.modal:not(.hide)')) return;

    gameState.timeLeft--;
    timerUI.querySelector("span").innerText = gameState.timeLeft;

    if (gameState.timeLeft <= 5) timerUI.classList.add("timer-pulse");
    else timerUI.classList.remove("timer-pulse");

    if (gameState.timeLeft <= 0) {
      clearInterval(gameState.timerId);
      handleGameOver(false);
    }
  }, 1000);
};

// --- END GAME ---
const handleGameOver = (win) => {
  gameState.gameStatus = "over";
  clearInterval(gameState.timerId);
  gameState.stats.totalGames++;

  const modal = document.getElementById("result-modal");
  modal.classList.remove("hide");

  if (win) {
    playSound('win');
    gameState.stats.wins++;
    gameState.stats.currentStreak++;
    if (gameState.stats.currentStreak > gameState.stats.bestStreak) gameState.stats.bestStreak = gameState.stats.currentStreak;

    const reward = 30 + (gameState.combo * 2);
    gameState.coins += reward;
    addXP(25);

    if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    document.getElementById("result-data").innerHTML = `
      <h2>VICTORY!</h2>
      <p style="color:var(--success); font-weight:bold;">+${reward} Coins</p>
      <p style="font-size:0.8rem; margin-bottom:15px;">Max Combo: x${gameState.combo}</p>
      <button class="action-btn" onclick="returnToMenu()">CONTINUE</button>
    `;
  } else {
    playSound('lose');
    gameState.stats.losses++;
    gameState.stats.currentStreak = 0;

    document.getElementById("result-data").innerHTML = `
      <h2>GAME OVER</h2>
      <p>The word was:</p>
      <h3 style="color:var(--danger); letter-spacing:3px;">${gameState.word}</h3>
      <button class="action-btn" style="background:var(--text);" onclick="returnToMenu()">MENU</button>
    `;
  }
  checkAchievements();
  saveState();
};

const returnToMenu = () => {
  document.getElementById("result-modal").classList.add("hide");
  document.getElementById("game-section").classList.add("hide");
  document.getElementById("menu-section").classList.remove("hide");
  init();
};

const abortGame = () => {
  if (confirm("Abandon mission? This counts as a loss.")) {
    clearInterval(gameState.timerId);
    gameState.stats.losses++;
    gameState.stats.currentStreak = 0;
    saveState();
    returnToMenu();
  }
};

const startDailyChallenge = () => {
  startGame("Countries", true); // Using countries for daily as fallback demo
};

// --- UI & MENUS ---
const toggleModal = (id) => { playSound('click'); document.getElementById(id).classList.toggle("hide"); };
const toggleTheme = () => {
  gameState.settings.theme = gameState.settings.theme === 'light' ? 'dark' : 'light';
  updateUI(); saveState();
};
const toggleSound = () => {
  gameState.settings.soundEnabled = !gameState.settings.soundEnabled;
  updateUI(); saveState();
};

const showToast = (msg) => {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = "fadeOut 0.3s forwards"; setTimeout(() => toast.remove(), 300); }, 2500);
};

// --- SHOP ---
const renderShop = () => {
  const grid = document.getElementById("colors-tab");
  if (!grid) return;
  grid.innerHTML = "";
  shopData.forEach(item => {
    const isOwned = gameState.settings.ownedColors.includes(item.id);
    const isActive = gameState.settings.activeColor === item.id;
    const card = document.createElement("div");
    card.className = `item-card ${isActive ? 'active-item' : ''}`;
    card.innerHTML = `
      <div style="background:${item.id}; width:30px; height:30px; border-radius:50%; margin: 0 auto 5px;"></div>
      <div style="font-size:0.8rem; font-weight:700">${item.name}</div>
      <div style="font-size:0.7rem">${isOwned ? (isActive ? 'USED' : 'EQUIP') : item.price + ' <i class="fas fa-coins coen"></i>'}</div>
    `;
    card.onclick = () => buyOrEquipSkin(item.id, item.price);
    grid.appendChild(card);
  });
};

const switchTab = (tabId, element) => {
  playSound('click');
  document.querySelectorAll('.shop-grid').forEach(grid => grid.classList.add('hide'));
  document.getElementById(tabId).classList.remove('hide');
  document.querySelectorAll('.tab-item').forEach(item => item.classList.remove('active'));
  element.classList.add('active');
  const indicator = document.querySelector('.tab-indicator');
  indicator.style.transform = tabId === 'boosters-tab' ? 'translateX(100%)' : 'translateX(0%)';
};

const buyOrEquipSkin = (id, price) => {
  playSound('click');
  if (gameState.settings.ownedColors.includes(id)) {
    gameState.settings.activeColor = id;
  } else if (gameState.coins >= price) {
    gameState.coins -= price;
    gameState.settings.ownedColors.push(id);
    gameState.settings.activeColor = id;
    showToast("Skin Unlocked!");
  } else {
    return showToast("Not enough coins!");
  }
  updateUI(); renderShop(); saveState();
  if (gameState.gameStatus === "playing") drawMan(gameState.wrongCount);
};

const buyInventoryItem = (type, price) => {
  playSound('click');
  if (gameState.coins >= price) {
    gameState.coins -= price;
    gameState.inventory[type]++;
    showToast(`Purchased 1x ${type}!`);
    updateUI(); saveState();
  } else {
    showToast("Not enough coins!");
  }
};

// --- STATS ---
const renderStats = () => {
  const sc = document.getElementById("stats-container");
  const s = gameState.stats;
  const acc = (s.correct + s.wrong) > 0 ? Math.round((s.correct / (s.correct + s.wrong)) * 100) : 0;

  sc.innerHTML = `
    <div class="stat-box">Games Played <span>${s.totalGames}</span></div>
    <div class="stat-box">Win Rate <span>${s.totalGames ? Math.round((s.wins / s.totalGames) * 100) : 0}%</span></div>
    <div class="stat-box">Best Streak <span>${s.bestStreak}</span></div>
    <div class="stat-box">Accuracy <span>${acc}%</span></div>
  `;

  const ac = document.getElementById("achievements-container");
  ac.innerHTML = "";
  Object.keys(achievementsData).forEach(key => {
    const isUnlocked = gameState.achievements.includes(key);
    ac.innerHTML += `
      <div class="ach-item ${isUnlocked ? 'unlocked' : ''}">
        <i class="fas fa-${isUnlocked ? 'trophy' : 'lock'}" style="color:${isUnlocked ? '#f1c40f' : '#888'}"></i>
        <div>
          <div style="font-weight:bold">${achievementsData[key].title}</div>
          <div style="font-size:0.7rem; color:#888">${achievementsData[key].desc}</div>
        </div>
      </div>
    `;
  });
};

const hardReset = () => {
  if (confirm("Reset ALL progress? This cannot be undone.")) {
    localStorage.removeItem("hangmanoid_state");
    location.reload();
  }
};

// Global Keyboard Events
document.addEventListener("keydown", (e) => {
  if (gameState.gameStatus !== "playing") return;
  const key = e.key.toUpperCase();
  if (key.match(/^[A-Z]$/)) handleGuess(key);
});

// Boot
init();