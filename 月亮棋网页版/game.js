const cells = document.querySelectorAll('.cell');
const statusDiv = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const winModal = document.getElementById('winModal');
const winMessage = document.getElementById('winMessage');
const modalResetBtn = document.getElementById('modalResetBtn');
const modeBtns = document.querySelectorAll('.mode-btn');
const diffBtns = document.querySelectorAll('.diff-btn');
const difficultySelector = document.getElementById('difficultySelector');

let board = Array(9).fill(null);
let currentPlayer = 'black';
let blackPieces = [];
let whitePieces = [];
let gameOver = false;
let gameMode = 'pvp';
let difficulty = 'medium';
let aiThinking = false;

const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

const confettiColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'];

// ── 音效系统 ──────────────────────────────────

let audioCtx = null;
let soundEnabled = true;
const soundToggle = document.getElementById('soundToggle');

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playTone(freq, duration, startTime, gainVal = 0.15, type = 'sine') {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

function playPlaceSound() {
    if (!soundEnabled) return;
    const t = getAudioCtx().currentTime;
    playTone(600, 0.08, t, 0.2, 'sine');
    playTone(400, 0.06, t + 0.03, 0.1, 'triangle');
}

function playWinSound() {
    if (!soundEnabled) return;
    const t = getAudioCtx().currentTime;
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
        playTone(freq, 0.3, t + i * 0.12, 0.12, 'sine');
    });
}

function playLoseSound() {
    if (!soundEnabled) return;
    const t = getAudioCtx().currentTime;
    const notes = [500, 420, 350, 280];
    notes.forEach((freq, i) => {
        playTone(freq, 0.25, t + i * 0.15, 0.1, 'triangle');
    });
}

// ── 粒子系统 ──────────────────────────────────

function createParticles(cellElement) {
    const rect = cellElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#f5e6b8', '#c8b4ff', '#ffd700', '#fff', '#e8c46a'];

    for (let i = 0; i < 10; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const dist = 25 + Math.random() * 35;
        p.style.setProperty('--px', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--py', Math.sin(angle) * dist + 'px');
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        p.style.width = (4 + Math.random() * 5) + 'px';
        p.style.height = p.style.width;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 700);
    }
}

// ── 月亮精灵 ──────────────────────────────────

const moonChar = document.getElementById('moonChar');

function showMoonChar(isWin) {
    moonChar.textContent = isWin ? '🌝' : '🌚';
    moonChar.className = 'moon-char show';
    setTimeout(() => { moonChar.className = 'moon-char'; }, 2500);
}

function hideMoonChar() {
    moonChar.className = 'moon-char';
}

// ── 工具函数 ──────────────────────────────────

function checkWinState(boardState, player) {
    return winPatterns.some(pattern =>
        pattern.every(index => boardState[index] === player)
    );
}

function checkWin(player) {
    return checkWinState(board, player);
}

// ── 游戏初始化 ────────────────────────────────

function initGame() {
    board = Array(9).fill(null);
    currentPlayer = 'black';
    blackPieces = [];
    whitePieces = [];
    gameOver = false;
    aiThinking = false;
    statusDiv.textContent = '黑棋先行';
    statusDiv.style.color = 'rgba(255,255,255,0.7)';
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.classList.remove('occupied');
    });
    hideModal();
}

// ── UI 更新 ───────────────────────────────────

function updateOldPieces(pieces) {
    cells.forEach(cell => {
        const piece = cell.querySelector('.piece');
        if (piece) piece.classList.remove('old');
    });

    if (pieces.length >= 3) {
        const oldestIndex = pieces[0];
        const oldestCell = cells[oldestIndex];
        const oldestPiece = oldestCell.querySelector('.piece');
        if (oldestPiece) oldestPiece.classList.add('old');
    }
}

function createConfetti() {
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.width = (Math.random() * 10 + 5) + 'px';
            confetti.style.height = (Math.random() * 10 + 5) + 'px';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

function showModal(player) {
    const isPlayerWin = (player === 'black' && gameMode === 'pve') ||
                         (player === 'white' && gameMode === 'pve' && difficulty !== 'easy');
    if (isPlayerWin) {
        playLoseSound();
        showMoonChar(false);
    } else {
        playWinSound();
        showMoonChar(true);
    }

    winMessage.textContent = `${player === 'black' ? '黑棋' : '白棋'}获胜！`;
    winModal.classList.add('show');
    createConfetti();
}

function hideModal() {
    winModal.classList.remove('show');
}

// ── 落子逻辑 ──────────────────────────────────

function placePiece(index) {
    if (board[index] !== null) return;

    board[index] = currentPlayer;
    const cell = cells[index];

    // 音效 & 粒子
    playPlaceSound();
    createParticles(cell);

    const piece = document.createElement('div');
    piece.className = `piece ${currentPlayer}`;
    cell.appendChild(piece);
    cell.classList.add('occupied');

    if (currentPlayer === 'black') {
        blackPieces.push(index);
        if (blackPieces.length > 3) {
            const oldestIndex = blackPieces.shift();
            board[oldestIndex] = null;
            const oldestCell = cells[oldestIndex];
            oldestCell.innerHTML = '';
            oldestCell.classList.remove('occupied');
        }
        updateOldPieces(blackPieces);
    } else {
        whitePieces.push(index);
        if (whitePieces.length > 3) {
            const oldestIndex = whitePieces.shift();
            board[oldestIndex] = null;
            const oldestCell = cells[oldestIndex];
            oldestCell.innerHTML = '';
            oldestCell.classList.remove('occupied');
        }
        updateOldPieces(whitePieces);
    }

    if (checkWin(currentPlayer)) {
        gameOver = true;
        const name = currentPlayer === 'black' ? '黑棋' : '白棋';
        statusDiv.textContent = `${name}获胜！`;
        statusDiv.style.color = currentPlayer === 'black' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.7)';
        setTimeout(() => showModal(currentPlayer), 500);
        return;
    }

    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    const turnName = currentPlayer === 'black' ? '黑棋' : '白棋';
    statusDiv.textContent = gameMode === 'pve' && currentPlayer === 'white'
        ? 'AI 思考中...'
        : `${turnName}回合`;

    // AI 自动落子
    if (gameMode === 'pve' && currentPlayer === 'white' && !gameOver) {
        aiThinking = true;
        setTimeout(aiMove, 500);
    }
}

// ═══════════════════════════════════════════════
// AI 核心 — 三档难度
// ═══════════════════════════════════════════════

const MINIMAX_MAX_DEPTH = 10;

function aiMove() {
    let move = null;

    switch (difficulty) {
        case 'easy':
            move = getRandomMove();
            break;
        case 'medium':
            move = getMediumMove();
            break;
        case 'hard':
            move = getHardMove();
            break;
    }

    if (move !== null && !gameOver) {
        placePiece(move);
    }
    aiThinking = false;
}

// ── 简单：纯随机 ─────────────────────────────

function getRandomMove() {
    const empty = [];
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) empty.push(i);
    }
    if (empty.length === 0) return null;
    return empty[Math.floor(Math.random() * empty.length)];
}

// ── 中等：必胜/必堵 + 浅层搜索 ──────────────

function getMediumMove() {
    // 1. 能赢就赢
    for (let i = 0; i < 9; i++) {
        if (board[i] !== null) continue;
        const simBoard = [...board];
        const simWhite = [...whitePieces];
        simBoard[i] = 'white';
        simWhite.push(i);
        if (simWhite.length > 3) {
            const removed = simWhite.shift();
            simBoard[removed] = null;
        }
        if (checkWinState(simBoard, 'white')) return i;
    }

    // 2. 对方能赢就堵
    for (let i = 0; i < 9; i++) {
        if (board[i] !== null) continue;
        const simBoard = [...board];
        const simBlack = [...blackPieces];
        simBoard[i] = 'black';
        simBlack.push(i);
        if (simBlack.length > 3) {
            const removed = simBlack.shift();
            simBoard[removed] = null;
        }
        if (checkWinState(simBoard, 'black')) return i;
    }

    // 3. 否则用浅层 minimax depth=4 评估选最优
    return getBestMoveByMinimax(4);
}

// ── 困难：完全 minimax depth=10 ──────────────

function getHardMove() {
    return getBestMoveByMinimax(10);
}

// ── 通用：用 minimax 评估选最优落子 ──────────

function getBestMoveByMinimax(maxDepth) {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < 9; i++) {
        if (board[i] !== null) continue;

        const simBoard = [...board];
        const simWhite = [...whitePieces];
        simBoard[i] = 'white';
        simWhite.push(i);
        if (simWhite.length > 3) {
            const removed = simWhite.shift();
            simBoard[removed] = null;
        }

        const score = minimax(simBoard, [...blackPieces], simWhite, 0, false, -Infinity, Infinity, maxDepth);
        if (score > bestScore) {
            bestScore = score;
            bestMove = i;
        }
    }

    return bestMove;
}

function minimax(boardState, blackOrder, whiteOrder, depth, isMaximizing, alpha, beta, maxDepth) {
    // 终局判定
    if (checkWinState(boardState, 'white')) return 1000 - depth;
    if (checkWinState(boardState, 'black')) return depth - 1000;

    // 到达搜索深度上限 → 用启发式打分
    if (depth >= maxDepth) {
        return evaluate(boardState);
    }

    // 收集可落子位置
    const moves = [];
    for (let i = 0; i < 9; i++) {
        if (boardState[i] === null) moves.push(i);
    }
    if (moves.length === 0) return 0;

    if (isMaximizing) {
        // AI（白棋）回合 — 最大化分数
        let maxScore = -Infinity;
        for (const i of moves) {
            const newBoard = [...boardState];
            const newWhite = [...whiteOrder];
            newBoard[i] = 'white';
            newWhite.push(i);
            if (newWhite.length > 3) {
                const removed = newWhite.shift();
                newBoard[removed] = null;
            }
            const score = minimax(newBoard, blackOrder, newWhite, depth + 1, false, alpha, beta, maxDepth);
            maxScore = Math.max(score, maxScore);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return maxScore;
    } else {
        // 人类（黑棋）回合 — 最小化分数
        let minScore = Infinity;
        for (const i of moves) {
            const newBoard = [...boardState];
            const newBlack = [...blackOrder];
            newBoard[i] = 'black';
            newBlack.push(i);
            if (newBlack.length > 3) {
                const removed = newBlack.shift();
                newBoard[removed] = null;
            }
            const score = minimax(newBoard, newBlack, whiteOrder, depth + 1, true, alpha, beta, maxDepth);
            minScore = Math.min(score, minScore);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return minScore;
    }
}

function evaluate(boardState) {
    let score = 0;

    for (const pattern of winPatterns) {
        let whiteCount = 0;
        let blackCount = 0;
        for (const idx of pattern) {
            if (boardState[idx] === 'white') whiteCount++;
            else if (boardState[idx] === 'black') blackCount++;
        }

        // 威胁程度
        if (whiteCount === 2 && blackCount === 0) score += 15;
        if (blackCount === 2 && whiteCount === 0) score -= 15;
        if (whiteCount === 1 && blackCount === 0) score += 2;
        if (blackCount === 1 && whiteCount === 0) score -= 2;
    }

    // 中心控制
    if (boardState[4] === 'white') score += 5;
    else if (boardState[4] === 'black') score -= 5;

    // 角落控制
    const corners = [0, 2, 6, 8];
    for (const c of corners) {
        if (boardState[c] === 'white') score += 2;
        else if (boardState[c] === 'black') score -= 2;
    }

    return score;
}

// ── 事件绑定 ──────────────────────────────────

let audioInitialized = false;

cells.forEach(cell => {
    cell.addEventListener('click', () => {
        // 首次交互初始化音频
        if (!audioInitialized) { getAudioCtx(); audioInitialized = true; }
        const index = parseInt(cell.dataset.index);
        if (gameOver || board[index] !== null || aiThinking) return;
        placePiece(index);
    });
});

resetBtn.addEventListener('click', initGame);
modalResetBtn.addEventListener('click', initGame);

// 音效开关
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
});

// 模式切换
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameMode = btn.dataset.mode;

        // PvE 时显示难度选择器，PvP 时隐藏
        difficultySelector.style.display = gameMode === 'pve' ? 'flex' : 'none';

        initGame();
    });
});

// 难度切换
diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
        initGame();
    });
});

initGame();
