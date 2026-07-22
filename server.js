const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.static(__dirname));
app.use(express.json());

// Game Data
const games = {}; // { gameId: { players: [], word, guessedLetters, wrongCount, turn, status } }
const players = {}; // { socketId: { name, gameId, avatar } }

// Word Database
const wordsList = {
    Fruits: ["PINEAPPLE", "AVOCADO", "STRAWBERRY", "BANANA", "ORANGE", "GRAPE", "TOMATO", "WATERMELON", "MANGO"],
    Animals: ["KANGAROO", "PENGUIN", "CROCODILE", "ELEPHANT", "CHEETAH", "BEAR", "BIRD", "DOG", "CAT"],
    Countries: ["UZBEKISTAN", "BRAZIL", "CANADA", "JAPAN", "GERMANY", "RUSSIA", "SPAIN", "ITALY", "USA"],
    FootballPlayers: ["MESSI", "RONALDO", "NEYMAR", "MBAPPE", "HAALAND", "SALAH", "KROOS"]
};

// Utility Functions
const getRandomWord = (category) => {
    const words = wordsList[category] || wordsList.Fruits;
    return words[Math.floor(Math.random() * words.length)];
};

const createGame = (category = 'Fruits') => {
    const gameId = uuidv4();
    games[gameId] = {
        gameId,
        category,
        word: getRandomWord(category),
        players: [],
        guessedLetters: [],
        wrongCount: 0,
        maxWrong: 6,
        currentTurn: 0,
        status: 'waiting', // waiting, playing, finished
        createdAt: new Date()
    };
    return gameId;
};

// Socket Events
io.on('connection', (socket) => {
    console.log(`✅ Player connected: ${socket.id}`);

    // --- MULTIPLAYER MODE ---

    // Player joins game
    socket.on('join_game', (data) => {
        const { playerName, gameId, avatar, category } = data;

        if (!games[gameId]) {
            const newGameId = createGame(category);
            games[newGameId].players.push({
                socketId: socket.id,
                name: playerName,
                avatar,
                score: 0,
                guesses: []
            });
            players[socket.id] = { name: playerName, gameId: newGameId, avatar };
            socket.emit('game_created', { gameId: newGameId });
            socket.join(newGameId);
        } else {
            const game = games[gameId];
            if (game.players.length >= 2) {
                socket.emit('error', { message: 'Game is full' });
                return;
            }
            game.players.push({
                socketId: socket.id,
                name: playerName,
                avatar,
                score: 0,
                guesses: []
            });
            players[socket.id] = { name: playerName, gameId, avatar };
            socket.join(gameId);
            game.status = 'playing';

            // Notify both players game started
            io.to(gameId).emit('game_started', {
                players: game.players,
                word: '_'.repeat(game.word.length),
                category: game.category
            });
        }
    });

    // List active games
    socket.on('list_games', () => {
        const activeGames = Object.values(games)
            .filter(g => g.status === 'waiting' && g.players.length < 2)
            .map(g => ({
                gameId: g.gameId,
                category: g.category,
                players: g.players.length,
                createdAt: g.createdAt
            }));
        socket.emit('games_list', activeGames);
    });

    // Player makes a guess
    socket.on('make_guess', (data) => {
        const { gameId, letter } = data;
        const game = games[gameId];

        if (!game || game.status !== 'playing') {
            socket.emit('error', { message: 'Game not found or finished' });
            return;
        }

        if (game.guessedLetters.includes(letter)) {
            socket.emit('error', { message: 'Letter already guessed' });
            return;
        }

        game.guessedLetters.push(letter);

        const isCorrect = game.word.includes(letter);
        if (!isCorrect) game.wrongCount++;

        // Find player index
        const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
            game.players[playerIndex].guesses.push(letter);
            if (isCorrect) game.players[playerIndex].score += 10;
        }

        // Check win/lose
        const wordComplete = game.word.split('').every(l => game.guessedLetters.includes(l));
        const gameLost = game.wrongCount >= game.maxWrong;

        // Send update to all players
        io.to(gameId).emit('guess_result', {
            letter,
            isCorrect,
            guessedLetters: game.guessedLetters,
            wrongCount: game.wrongCount,
            word: wordComplete ? game.word : game.word.split('').map(l => game.guessedLetters.includes(l) ? l : '_').join(''),
            playerScores: game.players.map(p => ({ name: p.name, score: p.score }))
        });

        if (wordComplete) {
            game.status = 'finished';
            io.to(gameId).emit('game_won', {
                winnerName: game.players[playerIndex]?.name,
                finalWord: game.word,
                word: game.word,
                scores: game.players
            });
        } else if (gameLost) {
            game.status = 'finished';
            io.to(gameId).emit('game_lost', {
                word: game.word,
                scores: game.players
            });
        }
    });

    // Play again
    socket.on('play_again', (data) => {
        const { gameId } = data;
        const game = games[gameId];
        if (game) {
            game.word = getRandomWord(game.category);
            game.guessedLetters = [];
            game.wrongCount = 0;
            game.status = 'playing';
            game.players.forEach(p => { p.score = 0; p.guesses = []; });

            io.to(gameId).emit('game_restarted', {
                word: '_'.repeat(game.word.length),
                players: game.players
            });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        const player = players[socket.id];
        if (player) {
            const game = games[player.gameId];
            if (game) {
                game.players = game.players.filter(p => p.socketId !== socket.id);
                if (game.players.length === 0) {
                    delete games[player.gameId];
                } else {
                    io.to(player.gameId).emit('player_left', {
                        message: `${player.name} left the game`,
                        players: game.players
                    });
                }
            }
            delete players[socket.id];
        }
        console.log(`❌ Player disconnected: ${socket.id}`);
    });
});

server.listen(3000, () => {
    console.log('🎮 Server running on http://localhost:3000');
});
