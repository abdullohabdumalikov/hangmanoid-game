// ===== MULTIPLAYER CLIENT CODE =====
// Bu kodi main.html ga qo'shish kerak

const socket = io('http://localhost:3000');

// Multiplayer State
let multiplayerState = {
    gameId: null,
    isMultiplayer: false,
    playerName: '',
    opponentName: '',
    opponentScore: 0,
    playerScore: 0
};

// --- MULTIPLAYER EVENT LISTENERS ---

// Game Created
socket.on('game_created', (data) => {
    multiplayerState.gameId = data.gameId;
    showToast(`Game ID: ${data.gameId.substring(0, 8)}... - Waiting for opponent...`);
});

// Game Started
socket.on('game_started', (data) => {
    multiplayerState.isMultiplayer = true;
    multiplayerState.opponentName = data.players.find(p => p.name !== multiplayerState.playerName)?.name || 'Opponent';

    document.getElementById('menu-section').classList.add('hide');
    document.getElementById('game-section').classList.remove('hide');
    document.getElementById('current-category').innerText = `${data.category} - MULTIPLAYER`;
    document.getElementById('multiplayer-opponent').innerText = `vs ${multiplayerState.opponentName}`;
    document.getElementById('multiplayer-info').classList.remove('hide');

    renderWord();
    renderKeyboard();
    updateUI();
});

// Guess Result
socket.on('guess_result', (data) => {
    gameState.guessedLetters = data.guessedLetters;
    gameState.wrongCount = data.wrongCount;

    data.playerScores.forEach(ps => {
        if (ps.name === multiplayerState.playerName) {
            multiplayerState.playerScore = ps.score;
        } else {
            multiplayerState.opponentScore = ps.score;
        }
    });

    renderWord();
    renderKeyboard();
    updateMultiplayerScore();

    playSound(data.isCorrect ? 'correct' : 'wrong');
    drawMan(data.wrongCount);
});

// Game Won
socket.on('game_won', (data) => {
    gameState.gameStatus = 'over';
    document.getElementById('game-over-title').innerText = `🎉 ${data.winnerName} WON!`;
    document.getElementById('game-section').classList.add('hide');
    document.getElementById('gameover-section').classList.remove('hide');

    updateMultiplayerScore();
    playSound('win');
    confetti();
});

// Game Lost
socket.on('game_lost', (data) => {
    gameState.gameStatus = 'over';
    gameState.word = data.word;
    document.getElementById('game-over-title').innerText = '😔 Game Over!';
    document.getElementById('game-section').classList.add('hide');
    document.getElementById('gameover-section').classList.remove('hide');

    updateMultiplayerScore();
    playSound('lose');
});

// Player Left
socket.on('player_left', (data) => {
    showToast(data.message);
});

// Error
socket.on('error', (data) => {
    showToast(data.message);
});

// --- MULTIPLAYER FUNCTIONS ---

const joinMultiplayerGame = async () => {
    const playerName = document.getElementById('mp-player-name').value || 'Player';
    const gameId = document.getElementById('mp-game-id').value || null;
    const category = document.getElementById('mp-category').value || 'Fruits';

    multiplayerState.playerName = playerName;

    socket.emit('join_game', {
        playerName,
        gameId,
        avatar: gameState.profile.avatar,
        category
    });
};

const listMultiplayerGames = () => {
    socket.emit('list_games');
    socket.on('games_list', (games) => {
        const container = document.getElementById('available-games');
        container.innerHTML = '';

        if (games.length === 0) {
            container.innerHTML = '<p>No available games. Create a new one!</p>';
            return;
        }

        games.forEach(game => {
            const div = document.createElement('div');
            div.className = 'game-item';
            div.innerHTML = `
        <div class="game-info">
          <strong>${game.category}</strong>
          <span>${game.players}/2 players</span>
        </div>
        <button onclick="document.getElementById('mp-game-id').value='${game.gameId}'; joinMultiplayerGame()">
          Join
        </button>
      `;
            container.appendChild(div);
        });
    });
};

const sendGuessMultiplayer = (letter) => {
    if (!multiplayerState.isMultiplayer) return;

    socket.emit('make_guess', {
        gameId: multiplayerState.gameId,
        letter
    });
};

const playAgainMultiplayer = () => {
    socket.emit('play_again', {
        gameId: multiplayerState.gameId
    });
};

socket.on('game_restarted', (data) => {
    gameState.guessedLetters = [];
    gameState.wrongCount = 0;
    gameState.gameStatus = 'playing';

    document.getElementById('gameover-section').classList.add('hide');
    document.getElementById('game-section').classList.remove('hide');

    renderWord();
    renderKeyboard();
    drawMan(0);
});

const updateMultiplayerScore = () => {
    const scoreDisplay = document.getElementById('mp-scores');
    if (scoreDisplay) {
        scoreDisplay.innerHTML = `
      <div class="score">👤 ${multiplayerState.playerName}: <strong>${multiplayerState.playerScore}</strong></div>
      <div class="score">👥 ${multiplayerState.opponentName}: <strong>${multiplayerState.opponentScore}</strong></div>
    `;
    }
};

// Override handleGuess for multiplayer
const handleGuessOriginal = handleGuess;
const handleGuessMultiplayer = (char, isSystem = false) => {
    if (multiplayerState.isMultiplayer) {
        sendGuessMultiplayer(char);
    } else {
        handleGuessOriginal(char, isSystem);
    }
};
