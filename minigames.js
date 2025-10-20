// minigames.js

// Zmienne do zarządzania stanem gry
let minigameInterval = null;
let isMinigameActive = false;
let isDragging = false;
let offsetX, offsetY; // Przesunięcie kursora względem rogu obrazka


function startDragEmployeeMinigame() {
    if (isMinigameActive) return; // Zapobiegaj wielokrotnemu uruchomieniu

    isMinigameActive = true;
    const modal = document.getElementById('minigame-modal');
    const employee = document.getElementById('draggable-employee');
    const desk = document.getElementById('dropzone-desk');
    const gameArea = document.getElementById('minigame-area');

    // Reset pracownika
    employee.src = 'img/face.png';
    employee.style.left = '10px';
    employee.style.top = '120px';
    employee.style.cursor = 'grab';

    // --- KLUCZOWA ZMIANA ---
    // NAJPIERW POKAZUJEMY MODAL...
    modal.style.display = 'block';
    // ...A DOPIERO POTEM GENERUJEMY ŚCIANY W JEGO WNĘTRZU
    generateWalls(gameArea, employee, desk);
    // --- KONIEC ZMIANY ---

    // Nowa logika przeciągania oparta na myszce
    employee.onmousedown = (event) => {
        isDragging = true;
        offsetX = event.clientX - employee.getBoundingClientRect().left;
        offsetY = event.clientY - employee.getBoundingClientRect().top;
        employee.style.cursor = 'grabbing';
    };

    document.onmousemove = (event) => {
        if (isDragging) {
            employee.style.left = `${event.clientX - gameArea.getBoundingClientRect().left - offsetX}px`;
            employee.style.top = `${event.clientY - gameArea.getBoundingClientRect().top - offsetY}px`;
        }
    };

    document.onmouseup = () => {
        if (isDragging) {
            isDragging = false;
            employee.style.cursor = 'grab';
            if (isOverlapping(employee.getBoundingClientRect(), desk.getBoundingClientRect())) {
                minigameSuccess();
            }
        }
    };
    
    // Pętla sprawdzająca kolizje ze ścianami
    minigameInterval = setInterval(() => {
        if (isDragging) {
            checkCollision(employee);
        }
    }, 30);
}

// Funkcja pomocnicza do sprawdzania, czy dwa prostokąty na siebie nachodzą
function isOverlapping(rect1, rect2) {
    return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
    );
}

function generateWalls(gameArea, employee, desk) {
    gameArea.querySelectorAll('.wall').forEach(wall => wall.remove());

    // Definiujemy strefy bezpieczne
    const employeeStartZone = { left: 0, top: 100, right: 100, bottom: 200 };
    const deskZone = { left: 500, top: 80, right: 600, bottom: 220 };

    const wallCount = 7;
    let createdWalls = 0;
    while (createdWalls < wallCount) {
        const wall = document.createElement('div');
        wall.className = 'wall';
        
        const isVertical = Math.random() > 0.5;
        const wallRect = {
            width: isVertical ? 20 : 100,
            height: isVertical ? 100 : 20,
            left: Math.random() * (gameArea.clientWidth - 100), // Ograniczamy pole generowania
            top: Math.random() * (gameArea.clientHeight - 100)
        };
        wallRect.right = wallRect.left + wallRect.width;
        wallRect.bottom = wallRect.top + wallRect.height;
        
        // Sprawdzamy, czy nowa ściana nie koliduje ze strefami bezpiecznymi
        if (!isOverlapping(wallRect, employeeStartZone) && !isOverlapping(wallRect, deskZone)) {
            wall.style.width = `${wallRect.width}px`;
            wall.style.height = `${wallRect.height}px`;
            wall.style.left = `${wallRect.left}px`;
            wall.style.top = `${wallRect.top}px`;
            gameArea.appendChild(wall);
            createdWalls++;
        }
    }
}

function checkCollision(employee) {
    if (!isMinigameActive) return;
    const employeeRect = employee.getBoundingClientRect();
    const walls = document.querySelectorAll('.wall');

    for (const wall of walls) {
        if (isOverlapping(employeeRect, wall.getBoundingClientRect())) {
            minigameFailure(employee);
            break; 
        }
    }
}

function stopMinigame() {
    clearInterval(minigameInterval);
    isMinigameActive = false;
    isDragging = false;
    
    // Zdejmij globalne eventy myszki, aby nie działały po zakończeniu gry
    document.onmousemove = null;
    document.onmouseup = null;

    const modal = document.getElementById('minigame-modal');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 1500);
}

function minigameSuccess() {
    if (!isMinigameActive) return;
    
    alert("Świetna robota! Pracownik wrócił do pracy. Bonus: 250 PLN.");
    const reward = 250;
    playerCash += reward;
    logEvent(`💪 Zmotywowałeś pracownika! Otrzymujesz bonus w wysokości ${reward} PLN.`, 'review');
    displayCash();
    stopMinigame();
}

function minigameFailure(employee) {
    if (!isMinigameActive) return;

    employee.src = 'img/face_sleeping.png';
    alert("Ajj! Pracownik uderzył w przeszkodę i poszedł spać. Spróbuj ponownie później.");
    logEvent(`😴 Próba motywacji pracownika nie powiodła się.`, 'review');
    stopMinigame();
}

let stackerGameArea, stack, currentBlock, isStackerGameOver;
let stackerScore, blockHeight, gameSpeed, animationFrameId;

const INITIAL_BLOCK_WIDTH = 120;
const BLOCK_HEIGHT = 20;
const INITIAL_SPEED = 2;

function startMoneyStackerGame() {
    isStackerGameOver = false;
    stackerScore = 0;
    blockHeight = 0;
    gameSpeed = INITIAL_SPEED;
    stack = [];

    const modal = document.getElementById('money-stacker-modal');
    stackerGameArea = document.getElementById('stacker-game-area');
    stackerGameArea.innerHTML = ''; // Wyczyść planszę
    modal.style.display = 'block';

    // Stwórz podstawę wieży
    const baseBlock = { x: (stackerGameArea.offsetWidth / 2) - (INITIAL_BLOCK_WIDTH / 2), width: INITIAL_BLOCK_WIDTH };
    stack.push(baseBlock);
    renderBlock(baseBlock, 0);

    // Stwórz pierwszy ruchomy klocek
    spawnNewBlock(INITIAL_BLOCK_WIDTH);
    
    document.addEventListener('keydown', handleStackerKeyPress);
    animationFrameId = requestAnimationFrame(stackerGameLoop);
}

function stopMoneyStackerGame() {
    cancelAnimationFrame(animationFrameId);
    document.removeEventListener('keydown', handleStackerKeyPress);
    document.getElementById('money-stacker-modal').style.display = 'none';
}

function handleStackerKeyPress(event) {
    if (event.code === 'Space' && !isStackerGameOver) {
        event.preventDefault();
        placeBlock();
    }
}

function placeBlock() {
    if (!currentBlock) return;
    currentBlock.direction = 0; // Zatrzymaj ruch boczny

    // --- NOWY FRAGMENT ---
    // Znajdź i usuń stary, poruszający się element DOM, ponieważ zaraz go zastąpimy statycznym.
    const oldMovingBlock = stackerGameArea.querySelector('.moving');
    if (oldMovingBlock) {
        oldMovingBlock.remove();
    }
    // --- KONIEC NOWEGO FRAGMENTU ---

    const topBlock = stack[stack.length - 1];
    
    const overlapStart = Math.max(currentBlock.x, topBlock.x);
    const overlapEnd = Math.min(currentBlock.x + currentBlock.width, topBlock.x + topBlock.width);
    const overlapWidth = overlapEnd - overlapStart;

    if (overlapWidth <= 0) {
        // P pudło! Koniec gry
        currentBlock.y = (blockHeight + 1) * BLOCK_HEIGHT;
        renderBlock(currentBlock, blockHeight + 1); // Narysuj spadający klocek
        endMoneyStackerGame();
        return;
    }

    // Część klocka została "odcięta"
    const newPlacedBlock = { x: overlapStart, width: overlapWidth };
    stack.push(newPlacedBlock);
    renderBlock(newPlacedBlock, blockHeight + 1); // Narysuj nowy, statyczny klocek na wieży

    // Aktualizuj wynik i wysokość
    blockHeight++;
    if (blockHeight > 1) stackerScore += 50;
    if (blockHeight > 1 && blockHeight % 5 === 0) stackerScore += 250;
    
    document.getElementById('stacker-score').textContent = stackerScore.toFixed(2);
    document.getElementById('stacker-height').textContent = blockHeight;

    // Zwiększ prędkość i stwórz nowy klocek
    gameSpeed *= 1.05;
    spawnNewBlock(overlapWidth);
}

function spawnNewBlock(width) {
    currentBlock = {
        x: 0,
        y: (blockHeight + 1) * BLOCK_HEIGHT,
        width: width,
        direction: 1 // 1 = w prawo, -1 = w lewo
    };
}

function renderBlock(blockData, height) {
    const blockElement = document.createElement('div');
    blockElement.className = 'stacker-block';
    blockElement.style.left = `${blockData.x}px`;
    blockElement.style.bottom = `${height * BLOCK_HEIGHT}px`;
    blockElement.style.width = `${blockData.width}px`;
    stackerGameArea.appendChild(blockElement);
    return blockElement;
}

function stackerGameLoop() {
    if (isStackerGameOver) return;

    // Przesuń bieżący klocek
    currentBlock.x += gameSpeed * currentBlock.direction;

    // Odbij od ścian
    if (currentBlock.x + currentBlock.width > stackerGameArea.offsetWidth || currentBlock.x < 0) {
        currentBlock.direction *= -1;
    }

    // Renderuj na nowo tylko ruchomy klocek
    let movingBlock = stackerGameArea.querySelector('.moving');
    if (!movingBlock) {
        movingBlock = renderBlock(currentBlock, blockHeight + 1);
        movingBlock.classList.add('moving');
    }
    movingBlock.style.left = `${currentBlock.x}px`;
    
    animationFrameId = requestAnimationFrame(stackerGameLoop);
}

function endMoneyStackerGame() {
    isStackerGameOver = true;
    const finalReward = stackerScore;
    
    if (finalReward > 0) {
        playerCash += finalReward;
        showToast(`Koniec gry! Zdobyłeś ${finalReward.toFixed(2)} PLN!`, 'success', 5000);
        logEvent(`💰 W minigrze "Wieża z Pieniędzy" zdobyto ${finalReward.toFixed(2)} PLN.`, 'review');
        displayCash();
    } else {
        showToast(`Koniec gry! Spróbuj jeszcze raz.`, 'default', 4000);
    }

    // --- DODANA LOGIKA ---
    // Poczekaj 2 sekundy i automatycznie zamknij okno gry
    setTimeout(() => {
        stopMoneyStackerGame();
    }, 1500);
}


// === NOWA FUNKCJA-PRZEŁĄCZNIK ===
function startRandomSpecialMinigame() {
    if (Math.random() < 0.5) {
        startDragEmployeeMinigame();
    } else {
        startMoneyStackerGame();
    }
}