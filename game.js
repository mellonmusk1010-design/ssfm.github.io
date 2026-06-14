const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const moneyText = document.getElementById('moneyText');
const stageText = document.getElementById('stageText');
const timeBar = document.getElementById('timeBar');
const tipText = document.getElementById('tipText');
const messageBox = document.getElementById('messageBox');
const startScreen = document.getElementById('startScreen');
const endScreen = document.getElementById('endScreen');
const endTitle = document.getElementById('endTitle');
const endText = document.getElementById('endText');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const battleButton = document.getElementById('battleButton');
const weaponCards = [...document.querySelectorAll('.weapon-card')];

const ROWS = 5;
const COLS = 9;
const UI_H = 136;
const PREP_TIME = 22000;
const BATTLE_TIME = 36000;
const START_MONEY = 280;
const MAX_STAGE = 5;
const ROW_LEFT = [0.53, 0.44, 0.35, 0.25, 0.17];

const weapons = {
    gun: { name: '총', cost: 65, hp: 180, range: 560, damage: 34, cool: 900, desc: '장거리 공격' },
    sword: { name: '검', cost: 55, hp: 250, range: 95, damage: 58, cool: 720, desc: '근거리 공격' },
    shield: { name: '방패', cost: 45, hp: 620, range: 0, damage: 0, cool: 0, desc: '방어 담당' },
};

let w = 0;
let h = 0;
let gridY = 0;
let cellH = 0;
let mode = 'start';
let stage = 1;
let money = START_MONEY;
let timer = PREP_TIME;
let spawnTime = 0;
let selected = 'gun';
let lastTime = 0;
let messageTime = 0;
let gameOver = false;

let pandas = [];
let monsters = [];
let bullets = [];
let effects = [];

const images = {
    bg: loadImage('바뀐 배경.png'),
    panda: loadImage('래서판다.png'),
    monster: loadImage('몬스터.png'),
};

function loadImage(src) {
    const img = new Image();
    img.loaded = false;
    img.onload = () => { img.loaded = true; };
    img.src = src;
    return img;
}

function resize() {
    w = Math.max(900, window.innerWidth);
    h = Math.max(560, window.innerHeight);
    canvas.width = w;
    canvas.height = h;
    gridY = UI_H + 34;
    cellH = Math.floor((h - gridY - 46) / ROWS);

    pandas.forEach(p => {
        p.x = cellX(p.col, p.row);
        p.y = cellY(p.row);
    });
    monsters.forEach(m => {
        m.y = cellY(m.row);
    });
}

function rowX(row) {
    return Math.max(250, Math.min(w * ROW_LEFT[row], w - 360));
}

function rowW(row) {
    return Math.max(360, w - rowX(row) - 70);
}

function cellW(row) {
    return rowW(row) / COLS;
}

function cellX(col, row) {
    return rowX(row) + col * cellW(row) + cellW(row) / 2;
}

function cellY(row) {
    return gridY + row * cellH + cellH / 2;
}

function startGame() {
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onCanvasClick);
    startButton.addEventListener('click', startPrep);
    restartButton.addEventListener('click', reset);
    battleButton.addEventListener('click', beginBattle);

    weaponCards.forEach(card => {
        card.addEventListener('click', () => {
            selected = card.dataset.weapon;
            updateUi();
        });
    });

    showMessage('시작 버튼을 눌러 주세요.');
    updateUi();
    requestAnimationFrame(loop);
}

function startPrep() {
    mode = 'prep';
    timer = PREP_TIME;
    startScreen.classList.add('hidden');
    showMessage('준비 시간입니다. 방어 인원을 배치하세요.');
    updateUi();
}

function beginBattle() {
    if (mode !== 'prep') return;
    mode = 'battle';
    timer = BATTLE_TIME;
    spawnTime = 900;
    showMessage(`${stage}단계 방어 시작`);
    updateUi();
}

function reset() {
    mode = 'start';
    stage = 1;
    money = START_MONEY;
    timer = PREP_TIME;
    selected = 'gun';
    gameOver = false;
    pandas = [];
    monsters = [];
    bullets = [];
    effects = [];
    startScreen.classList.remove('hidden');
    endScreen.classList.add('hidden');
    showMessage('시작 버튼을 눌러 주세요.');
    updateUi();
}

function onCanvasClick(event) {
    if (mode !== 'prep') {
        if (mode !== 'start' && !gameOver) showMessage('전투 중에는 배치할 수 없습니다.');
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (event.clientX - rect.left) * (canvas.width / rect.width);
    const my = (event.clientY - rect.top) * (canvas.height / rect.height);
    const cell = getCell(mx, my);
    if (!cell) return;

    const old = pandas.find(p => p.row === cell.row && p.col === cell.col);
    if (old) {
        upgradePanda(old);
    } else {
        addPanda(cell);
    }
    updateUi();
}

function getCell(mx, my) {
    const row = Math.floor((my - gridY) / cellH);
    if (row < 0 || row >= ROWS) return null;

    const col = Math.floor((mx - rowX(row)) / cellW(row));
    if (col < 0 || col >= COLS) return null;
    return { row, col };
}

function addPanda(cell) {
    const data = weapons[selected];
    if (money < data.cost) {
        showMessage('돈이 부족합니다.');
        return;
    }

    money -= data.cost;
    pandas.push({
        type: selected,
        name: data.name,
        row: cell.row,
        col: cell.col,
        x: cellX(cell.col, cell.row),
        y: cellY(cell.row),
        hp: data.hp,
        maxHp: data.hp,
        range: data.range,
        damage: data.damage,
        cool: data.cool,
        wait: 250,
        anim: 0,
        level: 1,
    });
}

function upgradePanda(panda) {
    const cost = 45 + panda.level * 25;
    if (money < cost) {
        showMessage('강화할 돈이 부족합니다.');
        return;
    }
    money -= cost;
    panda.level += 1;
    panda.maxHp += 55;
    panda.hp = panda.maxHp;
    panda.damage = Math.round(panda.damage * 1.18 + 6);
    showMessage(`${panda.name} 강화 완료`);
}

function loop(now) {
    const dt = Math.min(40, now - lastTime || 16);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

function update(dt) {
    if (messageTime > 0) {
        messageTime -= dt;
        if (messageTime <= 0) messageBox.classList.add('hidden');
    }
    if (gameOver || mode === 'start') return;

    timer -= dt;
    if (mode === 'prep' && timer <= 0) beginBattle();
    if (mode === 'battle') updateBattle(dt);
    updateEffects(dt);
    updateUi();
}

function updateBattle(dt) {
    spawnTime -= dt;
    if (spawnTime <= 0 && timer > 2500) {
        addMonster();
        spawnTime = Math.max(1250, 3100 - stage * 220 + Math.random() * 1300);
    }

    pandas.forEach(p => attackMonster(p, dt));
    moveBullets(dt);
    moveMonsters(dt);

    pandas = pandas.filter(p => !p.dead);
    monsters = monsters.filter(m => !m.dead);

    if (timer <= 0 && monsters.length === 0) nextStage();
}

function attackMonster(panda, dt) {
    panda.wait -= dt;
    panda.anim = Math.max(0, panda.anim - dt / 180);
    if (panda.type === 'shield') return;

    const target = monsters
        .filter(m => m.row === panda.row && m.x > panda.x - 20 && m.x - panda.x <= panda.range)
        .sort((a, b) => a.x - b.x)[0];

    if (!target || panda.wait > 0) return;

    if (panda.type === 'gun') {
        bullets.push({ x: panda.x + 30, y: panda.y - 12, row: panda.row, damage: panda.damage });
        effects.push({ type: 'flash', x: panda.x + 35, y: panda.y - 12, life: 130 });
    } else {
        target.hp -= panda.damage;
        panda.anim = 1;
        effects.push({ type: 'slash', x: panda.x + 38, y: panda.y - 5, life: 190 });
        if (target.hp <= 0) killMonster(target);
    }
    panda.wait = Math.max(260, panda.cool - panda.level * 35);
}

function moveBullets(dt) {
    bullets.forEach(b => {
        b.x += 10 * (dt / 16);
        const hit = monsters.find(m => m.row === b.row && b.x > m.x && b.x < m.x + m.w);
        if (!hit) return;
        hit.hp -= b.damage;
        b.dead = true;
        effects.push({ type: 'hit', x: b.x, y: b.y, life: 160 });
        if (hit.hp <= 0) killMonster(hit);
    });
    bullets = bullets.filter(b => !b.dead && b.x < w + 40);
}

function moveMonsters(dt) {
    monsters.forEach(m => {
        const target = pandas
            .filter(p => p.row === m.row && Math.abs(m.x - p.x) < 50)
            .sort((a, b) => b.col - a.col)[0];

        if (target) {
            m.wait -= dt;
            m.anim = Math.max(0, m.anim - dt / 160);
            if (m.wait <= 0) {
                target.hp -= m.damage;
                target.dead = target.hp <= 0;
                m.wait = m.cool;
                m.anim = 1;
            }
        } else {
            m.x -= m.speed * (dt / 16);
        }

        if (m.x < rowX(m.row) - 70) finish(false);
    });
}

function addMonster() {
    const row = Math.floor(Math.random() * ROWS);
    const hard = stage >= 3 && Math.random() < stage * 0.08;
    const hp = hard ? 160 + stage * 30 : 82 + stage * 18;
    monsters.push({
        row,
        x: w + 40,
        y: cellY(row),
        w: hard ? 72 : 60,
        h: hard ? 88 : 76,
        hp,
        maxHp: hp,
        speed: hard ? 0.34 + stage * 0.035 : 0.42 + stage * 0.035,
        damage: hard ? 25 + stage * 3 : 14 + stage * 2,
        cool: hard ? 850 : 760,
        wait: 350,
        hard,
        anim: 0,
    });
}

function killMonster(monster) {
    if (monster.dead) return;
    monster.dead = true;
    const gain = monster.hard ? 65 : 42;
    money += gain;
    effects.push({ type: 'coin', x: monster.x, y: monster.y - 30, text: `+${gain}`, life: 700 });
}

function nextStage() {
    stage += 1;
    if (stage > MAX_STAGE) {
        finish(true);
        return;
    }
    mode = 'prep';
    timer = PREP_TIME;
    money += 145 + stage * 35;
    bullets = [];
    effects = [];
    pandas.forEach(p => {
        p.hp = Math.min(p.maxHp, p.hp + 120);
    });
    showMessage(`${stage}단계 준비 시간입니다.`);
}

function finish(win) {
    if (gameOver) return;
    gameOver = true;
    mode = win ? 'win' : 'lose';
    endTitle.textContent = win ? '방어 성공' : '방어 실패';
    endText.textContent = win ? '작전 구역을 끝까지 지켜냈습니다.' : '방어선이 돌파되었습니다.';
    endScreen.classList.remove('hidden');
}

function updateEffects(dt) {
    effects.forEach(e => { e.life -= dt; });
    effects = effects.filter(e => e.life > 0);
}

function showMessage(text) {
    messageBox.textContent = text;
    messageBox.classList.remove('hidden');
    messageTime = 2400;
}

function updateUi() {
    moneyText.textContent = `재화 ${money}`;
    stageText.textContent = `단계 ${stage}/${MAX_STAGE}`;
    const maxTime = mode === 'prep' ? PREP_TIME : BATTLE_TIME;
    const percent = Math.max(0, Math.min(100, timer / maxTime * 100));
    timeBar.style.width = `${percent}%`;
    tipText.textContent = `${weapons[selected].desc} / 배치한 칸을 누르면 강화`;
    battleButton.disabled = mode !== 'prep';
    weaponCards.forEach(card => card.classList.toggle('active', card.dataset.weapon === selected));
}

function draw() {
    ctx.clearRect(0, 0, w, h);
    drawBg();
    drawGrid();
    drawPandas();
    drawMonsters();
    drawBullets();
    drawEffects();
}

function drawBg() {
    if (images.bg.loaded) {
        ctx.drawImage(images.bg, 0, 0, w, h);
        ctx.fillStyle = 'rgba(255, 248, 220, 0.08)';
        ctx.fillRect(0, UI_H, w, h - UI_H);
    } else {
        ctx.fillStyle = '#487a39';
        ctx.fillRect(0, 0, w, h);
    }
}

function drawGrid() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cw = cellW(r);
            const x = rowX(r) + c * cw;
            const y = gridY + r * cellH;
            ctx.fillStyle = (r + c) % 2 ? 'rgba(30, 69, 43, 0.22)' : 'rgba(44, 91, 55, 0.28)';
            round(x + 4, y + 4, cw - 8, cellH - 8, 8, true);
            ctx.strokeStyle = 'rgba(237, 224, 174, 0.22)';
            round(x + 4, y + 4, cw - 8, cellH - 8, 8, false);
        }
    }
}

function drawPandas() {
    [...pandas].sort((a, b) => a.y - b.y).forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y + Math.sin(performance.now() * 0.004 + p.col) * 2);
        drawPandaImage(p);
        if (p.type === 'gun') drawGun(p);
        if (p.type === 'sword') drawSword(p);
        if (p.type === 'shield') drawShield(p);
        ctx.restore();
        drawHp(p.x - 30, p.y - 58, 60, p.hp / p.maxHp);
    });
}

function drawPandaImage(panda) {
    if (images.panda.loaded) {
        const size = panda.type === 'shield' ? 76 : 70;
        ctx.drawImage(images.panda, -size / 2, -size / 2 - 11, size, size * 1.25);
        return;
    }
    ctx.fillStyle = '#d86d3b';
    ctx.beginPath();
    ctx.arc(0, -10, 24, 0, Math.PI * 2);
    ctx.fill();
}

function drawGun(p) {
    const kick = p.wait > p.cool - 130 ? -5 : 0;
    ctx.fillStyle = '#15191f';
    round(18 + kick, -18, 58, 10, 4, true);
    ctx.fillStyle = '#795a35';
    round(21 + kick, -8, 11, 18, 3, true);
}

function drawSword(p) {
    ctx.save();
    ctx.rotate(-0.6 - p.anim * 1.15);
    ctx.fillStyle = '#f4fbff';
    round(20, -46, 8, 58, 4, true);
    ctx.fillStyle = '#415066';
    round(12, 6, 25, 6, 3, true);
    ctx.restore();
}

function drawShield(p) {
    const hp = p.hp / p.maxHp;
    ctx.fillStyle = '#3e4b55';
    round(22, -31, 35, 58, 9, true);
    ctx.fillStyle = '#8caa64';
    round(27, -25, 25, 46, 7, true);
    if (hp < 0.7) crack(34, -17);
    if (hp < 0.45) crack(44, 3);
    if (hp < 0.25) crack(31, 13);
}

function crack(x, y) {
    ctx.strokeStyle = '#1f272c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5, y + 6);
    ctx.lineTo(x - 2, y + 13);
    ctx.lineTo(x + 6, y + 19);
    ctx.stroke();
}

function drawMonsters() {
    monsters.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.anim * 0.15);
        if (images.monster.loaded) {
            const size = m.hard ? 96 : 82;
            ctx.drawImage(images.monster, -size / 2, -size / 2 - 18, size * 0.62, size * 1.35);
        } else {
            ctx.fillStyle = '#5c4638';
            ctx.beginPath();
            ctx.ellipse(0, 8, 26, 38, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        drawHp(m.x - 30, m.y - 58, 58, m.hp / m.maxHp);
    });
}

function drawBullets() {
    bullets.forEach(b => {
        ctx.fillStyle = '#ffe07a';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawEffects() {
    effects.forEach(e => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, e.life / 700);
        if (e.type === 'coin') {
            ctx.fillStyle = '#ffd15a';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(e.text, e.x, e.y);
        } else {
            ctx.strokeStyle = e.type === 'slash' ? '#ddebff' : '#ffe07a';
            ctx.lineWidth = e.type === 'slash' ? 6 : 3;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.type === 'slash' ? 34 : 18, -1.2, 0.9);
            ctx.stroke();
        }
        ctx.restore();
    });
}

function drawHp(x, y, width, pct) {
    const p = Math.max(0, Math.min(1, pct));
    ctx.fillStyle = 'rgba(30, 20, 20, 0.75)';
    round(x, y, width, 7, 4, true);
    ctx.fillStyle = p > 0.55 ? '#6fe06f' : p > 0.28 ? '#ffd15a' : '#ff655c';
    round(x, y, width * p, 7, 4, true);
}

function round(x, y, width, height, radius, fill) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    if (fill) ctx.fill();
    else ctx.stroke();
}

window.addEventListener('load', startGame);
