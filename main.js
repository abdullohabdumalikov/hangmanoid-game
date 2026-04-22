// --- O'yin ma'lumotlari ---
const words = {
  Fruits: ["PINEAPPLE", "AVOCADO", "STRAWBERRY", "BANANA", "ORANGE", "GRAPE", "TOMATO", 'WATERMELON', 'MANGO', 'MELON', 'BLUEBERRY', 'RASPBERRY', 'APPLE', 'DATE', 'PLUM', 'LEMON', 'PEAR', 'PEACH', 'GRAPEFRUIT', 'LIME', 'TANGERINE', 'COCONUT', 'PAPAYA', 'FIG', 'KIWI', 'APRICOT', 'CHERRY', 'CRANBERRY', 'GUAVA', 'LYCHEE', 'NECTARINE', 'POMEGRANATE', 'QUINCE', 'STARFRUIT', 'PASSIONFRUIT', 'DRAGONFRUIT', 'ELDERBERRY', 'GOOSEBERRY', 'HONEYDEW', 'JACKFRUIT', 'KUMQUAT', 'LOQUAT', 'MULBERRY', 'OLIVE', 'PERSIMMON', 'QUANDONG', 'RAMBUTAN', 'SOURSOP', 'VOAVANGA', 'YUZU'],
  Animals: ["KANGAROO", "PENGUIN", "CROCODILE", "ELEPHANT", "CHEETAH", "BEAR", 'BIRD', 'DONKEY', 'DOG', 'CAT', 'MONKEY', 'SNAKE', 'GOAT', 'MOUSE', 'HIPPO', 'PIG', "HORSE", 'DUCK', 'SWAN', 'WOLF', "FOX", 'AXOLOTI', 'FROG', 'RABBIT', 'SQUIRREL', 'TURTLE', 'ZEBRA', 'LION', 'TIGER', 'GIRAFFE', 'SHEEP', 'LLAMA', 'OTTER', 'DEER', 'CAMEL', 'COW', 'CHICKEN', 'FLAMINGO', 'GORILLA', 'LEOPARD', 'MOOSE', 'OCTOPUS', 'PEACOCK', 'PORCUPINE', 'RACCOON', 'RHINO', 'SEAL', 'SHARK', 'SLOTH', 'TURKEY', 'WHALE', 'YAK'],
  Countries: ["UZBEKISTAN", "BRAZIL", "CANADA", "JAPAN", "GERMANY", "RUSSIA", 'SPAIN', 'ITALIY', 'USA', "AUSTRALIA", 'UK', "MEXICO", 'CHINA', 'ARMENIA', 'ARGENTINA', 'PORTUGAL', 'KAZAKHSTAN', 'TURKEY', 'PHILIPPINES', 'FRANCE', 'ZIMBABWE', 'INDIA', 'INDONESIA', 'EGYPT', 'IRAQ', 'IRAN', 'SAUDI ARABIA', 'THAILAND', 'MALAYSIA', 'SINGAPORE', 'VIETNAM', 'BANGLADESH', 'PAKISTAN', 'NIGERIA', 'ETHIOPIA', 'SOUTH AFRICA', 'COLOMBIA', 'ARGENTINA', 'UKRAINE', 'ALGERIA', 'MOROCCO', 'PERU', 'VENEZUELA', 'GREECE', 'SWEDEN', 'NORWAY', 'DENMARK', 'FINLAND', 'IRELAND', 'SWITZERLAND', 'AUSTRIA'],
};

const shopData = [
  { id: "#4834d4", name: "Royal", price: 0 },
  { id: "#eb4d4b", name: "Crimson", price: 500 },
  { id: "#6ab04c", name: "Forest", price: 500 },
  { id: "#f9ca24", name: "Gold", price: 2000 },
  { id: "#22a6b3", name: "Cyan", price: 600 },
  { id: "#be2edd", name: "Purple", price: 800 },
  { id: "#2f3542", name: "Coal", price: 400 },
  { id: "#ff7f50", name: "Coral", price: 700 },
  { id: "#badc58", name: "Lime", price: 550 },
  { id: "#7ed6df", name: "Sky", price: 650 },
  { id: "#e056fd", name: "Neon", price: 1200 },
  { id: "#686de0", name: "Blurple", price: 900 },
  { id: "#30336b", name: "Deep", price: 1100 },
  { id: "#95afc0", name: "Steel", price: 450 },
  { id: "#ffbe76", name: "Honey", price: 750 }
];

// --- Global o'zgaruvchilar ---
let coins = parseInt(localStorage.getItem("h-coins")) || 250;
let activeColor = localStorage.getItem("h-color") || "#4834d4";
let ownedItems = JSON.parse(localStorage.getItem("h-owned")) || ["#4834d4"];
let chosenWord = "";
let winCount = 0;
let count = 0;

// --- Dasturni ishga tushirish ---
const init = () => {
  document.documentElement.style.setProperty('--accent', activeColor);
  if (localStorage.getItem("h-dark") === "true") document.body.classList.add("dark-theme");
  document.getElementById("coins").innerText = coins;

  const menu = document.getElementById("category-list");
  menu.innerHTML = "";
  Object.keys(words).forEach(cat => {
    let b = document.createElement("button");
    b.className = "category-btn";
    b.innerHTML = `<span>${cat}</span> <i class="fas fa-play"></i>`;
    b.onclick = () => startGame(cat);
    menu.appendChild(b);
  });
  renderShop();
  drawMan(0);
};

// --- Shop Tab Mantiqi ---
const switchTab = (tabId, element) => {
  // Barcha gridlarni yashirish
  document.querySelectorAll('.shop-grid').forEach(grid => grid.classList.add('hide'));
  // Tanlanganini ko'rsatish
  document.getElementById(tabId).classList.remove('hide');

  // Tab tugmalarini yangilash
  document.querySelectorAll('.tab-item').forEach(item => item.classList.remove('active'));
  element.classList.add('active');

  // Indikatorni surish
  const indicator = document.querySelector('.tab-indicator');
  if (tabId === 'boosters-tab') {
    indicator.style.transform = 'translateX(100%)';
  } else {
    indicator.style.transform = 'translateX(0%)';
  }
};

// --- O'yin jarayoni ---
const startGame = (cat) => {
  document.getElementById("menu-section").classList.add("hide");
  document.getElementById("game-section").classList.remove("hide");
  document.getElementById("current-category").innerText = cat;
  chosenWord = words[cat][Math.floor(Math.random() * words[cat].length)];
  winCount = 0;
  count = 0;
  document.getElementById("word-display").innerHTML = chosenWord.replace(/./g, '<span class="dash">_</span>');
  renderKeyboard();
  drawMan(0);
};

const renderKeyboard = () => {
  const kb = document.getElementById("keyboard");
  kb.innerHTML = "";
  // Klassik QWERTY tartibi
  const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

  rows.forEach(rowStr => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "kb-row";

    rowStr.split("").forEach(char => {
      const btn = document.createElement("button");
      btn.className = "key";
      btn.innerText = char;
      btn.id = "key-" + char;
      btn.onclick = () => handleGuess(char);
      rowDiv.appendChild(btn);
    });

    kb.appendChild(rowDiv);
  });
};

const handleGuess = (char) => {
  const btn = document.getElementById("key-" + char);
  if (!btn || btn.disabled) return;
  btn.disabled = true;

  if (chosenWord.includes(char)) {
    const dashes = document.querySelectorAll(".dash");
    chosenWord.split("").forEach((l, i) => {
      if (l === char) {
        dashes[i].innerText = l;
        winCount++;
      }
    });
    if (winCount === chosenWord.length) endGame(true);
  } else {
    count++;
    drawMan(count);
    if (count === 6) endGame(false);
  }
};

// --- Vizual qismlar ---
const drawMan = (step) => {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 200, 200);
  ctx.strokeStyle = activeColor;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  // Gallows
  ctx.beginPath(); ctx.moveTo(20, 170); ctx.lineTo(150, 170); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, 170); ctx.lineTo(40, 20); ctx.lineTo(120, 20); ctx.lineTo(120, 40); ctx.stroke();

  // Person
  if (step > 0) { ctx.beginPath(); ctx.arc(120, 60, 20, 0, Math.PI * 2); ctx.stroke(); }
  if (step > 1) { ctx.beginPath(); ctx.moveTo(120, 80); ctx.lineTo(120, 130); ctx.stroke(); }
  if (step > 2) { ctx.beginPath(); ctx.moveTo(120, 90); ctx.lineTo(90, 110); ctx.stroke(); }
  if (step > 3) { ctx.beginPath(); ctx.moveTo(120, 90); ctx.lineTo(150, 110); ctx.stroke(); }
  if (step > 4) { ctx.beginPath(); ctx.moveTo(120, 130); ctx.lineTo(100, 160); ctx.stroke(); }
  if (step > 5) { ctx.beginPath(); ctx.moveTo(120, 130); ctx.lineTo(140, 160); ctx.stroke(); }
};

// --- Do'kon funksiyalari ---
const renderShop = () => {
  const grid = document.getElementById("colors-tab");
  if (!grid) return;
  grid.innerHTML = "";
  shopData.forEach(item => {
    const isOwned = ownedItems.includes(item.id);
    const isActive = activeColor === item.id;
    const card = document.createElement("div");
    card.className = `item-card ${isActive ? 'active-item' : ''}`;
    card.innerHTML = `
          <div style="background:${item.id}; width:25px; height:25px; border-radius:50%; margin: 0 auto 5px;"></div>
          <div style="font-size:0.7rem; font-weight:700">${item.name}</div>
          <div style="font-size:0.6rem">${isOwned ? (isActive ? 'USED' : 'USE') : item.price + '💰'}</div>
      `;
    card.onclick = () => buyOrEquip(item.id, item.price);
    grid.appendChild(card);
  });
};

const buyOrEquip = (id, price) => {
  if (ownedItems.includes(id)) {
    activeColor = id;
  } else if (coins >= price) {
    coins -= price;
    ownedItems.push(id);
    activeColor = id;
  } else {
    return alert("Not enough coins!");
  }
  saveData();
  document.documentElement.style.setProperty('--accent', activeColor);
  document.getElementById("coins").innerText = coins;
  renderShop();
  drawMan(count);
};

const useHint = () => {
  if (coins < 20) return alert("Not enough coins!");
  const dashes = document.querySelectorAll(".dash");
  const emptyIndices = [];
  chosenWord.split("").forEach((l, i) => {
    if (dashes[i].innerText === "_") emptyIndices.push(i);
  });
  if (emptyIndices.length > 0) {
    coins -= 20;
    document.getElementById("coins").innerText = coins;
    const randIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    handleGuess(chosenWord[randIdx]);
    saveData();
  }
};

// --- Yordamchi funksiyalar ---
const saveData = () => {
  localStorage.setItem("h-coins", coins);
  localStorage.setItem("h-owned", JSON.stringify(ownedItems));
  localStorage.setItem("h-color", activeColor);
};

const endGame = (win) => {
  const modal = document.getElementById("result-modal");
  modal.classList.remove("hide");
  if (win) {
    coins += 50;
    if (typeof confetti === 'function') confetti();
    document.getElementById("result-data").innerHTML = `<h2>VICTORY!</h2><p>+50 Coins</p><button class="modal-back-btn" onclick="location.reload()">NEXT</button>`;
  } else {
    document.getElementById("result-data").innerHTML = `<h2>GAME OVER</h2><p>Word was: ${chosenWord}</p><button class="modal-back-btn" onclick="location.reload()">RETRY</button>`;
  }
  saveData();
};

const toggleModal = (id) => document.getElementById(id).classList.toggle("hide");

const toggleTheme = () => {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem("h-dark", isDark);
};

const resetGame = () => {
  if (confirm("Reset all?")) {
    localStorage.clear();
    location.reload();
  }
};

// Fizik klaviatura eventlari
document.addEventListener("keydown", (e) => {
  const gameSec = document.getElementById("game-section");
  if (gameSec && gameSec.classList.contains("hide")) return;
  const key = e.key.toUpperCase();
  if (key.match(/^[A-Z]$/)) handleGuess(key);
});

// O'yinni boshlash
init();