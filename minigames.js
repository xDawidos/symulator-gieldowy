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
    // Inicjalizacja zmiennych stanu gry
    isStackerGameOver = false;
    stackerScore = 0;
    blockHeight = 0; // Wieża zaczyna się od poziomu 0
    gameSpeed = INITIAL_SPEED;
    stack = []; // Tablica przechowująca dane statycznych klocków w wieży

    // Pobranie elementów interfejsu
    const modal = document.getElementById('money-stacker-modal');
    stackerGameArea = document.getElementById('stacker-game-area');

    // Sprawdzenie, czy elementy UI istnieją
    if (!modal || !stackerGameArea) {
        console.error("Nie znaleziono elementów UI dla minigry Money Stacker!");
        return;
    }

    stackerGameArea.innerHTML = ''; // Wyczyść planszę przed rozpoczęciem

    // Ustawienie początkowych wartości w UI
    const scoreElement = document.getElementById('stacker-score');
    const heightElement = document.getElementById('stacker-height');
    if (scoreElement) scoreElement.textContent = '0';
    if (heightElement) heightElement.textContent = '0';

    modal.style.display = 'block'; // Pokaż okno gry

    // Stwórz podstawę wieży
    // Upewnij się, że obszar gry ma już wymiary
    const gameAreaWidth = stackerGameArea.offsetWidth;
    if (gameAreaWidth <= 0) {
        console.error("Obszar gry Money Stacker ma zerową szerokość!");
         // Można spróbować opóźnić start lub ustawić domyślną szerokość
        // Na razie zakończymy, aby uniknąć błędów
        modal.style.display = 'none';
        return;
    }
    const baseBlock = { x: (gameAreaWidth / 2) - (INITIAL_BLOCK_WIDTH / 2), width: INITIAL_BLOCK_WIDTH };
    stack.push(baseBlock);
    renderBlock(baseBlock, 0); // Renderuj podstawę na wysokości 0

    // Stwórz pierwszy ruchomy klocek (jego renderowanie odbędzie się w spawnNewBlock/renderMovingBlock)
    spawnNewBlock(INITIAL_BLOCK_WIDTH);

    // Dodaj nasłuchiwanie na naciśnięcie spacji
    document.removeEventListener('keydown', handleStackerKeyPress); // Usuń stary listener na wszelki wypadek
    document.addEventListener('keydown', handleStackerKeyPress);

    // Anuluj poprzednią pętlę animacji, jeśli istniała
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    // Rozpocznij pętlę gry
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
    currentBlock.direction = 0; // Zatrzymaj ruch

    const oldMovingBlock = stackerGameArea.querySelector('.moving');
    if (oldMovingBlock) {
        oldMovingBlock.remove(); // Usuń stary ruchomy element
    }

    const topBlock = stack[stack.length - 1];
    const overlapStart = Math.max(currentBlock.x, topBlock.x);
    const overlapEnd = Math.min(currentBlock.x + currentBlock.width, topBlock.x + topBlock.width);
    const overlapWidth = overlapEnd - overlapStart;

    if (overlapWidth <= 0) {
        // Renderuj spadający klocek na właściwej wysokości
        renderBlock(currentBlock, blockHeight + 1);
        endMoneyStackerGame();
        return;
    }

    const newPlacedBlock = { x: overlapStart, width: overlapWidth };
    stack.push(newPlacedBlock);
    renderBlock(newPlacedBlock, blockHeight + 1); // Renderuj nowy statyczny klocek

    blockHeight++;
    // ... (reszta logiki punktów i aktualizacji UI) ...
     if (blockHeight > 1) stackerScore += 50;
     if (blockHeight > 1 && blockHeight % 5 === 0) stackerScore += 250;
     document.getElementById('stacker-score').textContent = stackerScore.toFixed(0); // Zmień na 0 miejsc po przecinku
     document.getElementById('stacker-height').textContent = blockHeight;

    gameSpeed *= 1.05;
    if(stackerGameArea) { // Sprawdź czy gameArea istnieje
      spawnNewBlock(overlapWidth); // Spawnuj nowy klocek
    } else {
        console.error("stackerGameArea not found in placeBlock!");
        endMoneyStackerGame(); // Zakończ grę, jeśli coś poszło nie tak
    }
}

function spawnNewBlock(width) {
    currentBlock = {
        x: 0,
        
        width: width,
        direction: 1 // 1 = w prawo, -1 = w lewo
    };
    renderMovingBlock();
}

function renderMovingBlock() {
     let movingBlock = stackerGameArea.querySelector('.moving');
    if (!movingBlock) {
        movingBlock = renderBlock(currentBlock, blockHeight + 1); // Renderuj na wysokości +1
        movingBlock.classList.add('moving');
    }
    movingBlock.style.left = `${currentBlock.x}px`;
    movingBlock.style.width = `${currentBlock.width}px`; // Upewnij się, że szerokość jest aktualna
    movingBlock.style.bottom = `${(blockHeight + 1) * BLOCK_HEIGHT}px`; // Upewnij się, że wysokość jest aktualna
}

function renderBlock(blockData, height) {
    const blockElement = document.createElement('div');
    blockElement.className = 'stacker-block';
    blockElement.style.left = `${blockData.x}px`;
    blockElement.style.bottom = `${height * BLOCK_HEIGHT}px`;
    blockElement.style.width = `${blockData.width}px`;
    blockElement.style.height = `${BLOCK_HEIGHT}px`; // Upewnij się, że wysokość jest stała
    stackerGameArea.appendChild(blockElement);
    return blockElement;
}

function stackerGameLoop() {
    if (isStackerGameOver || !currentBlock) return; // Dodano sprawdzenie currentBlock

    currentBlock.x += gameSpeed * currentBlock.direction;

    if (currentBlock.x + currentBlock.width > stackerGameArea.offsetWidth || currentBlock.x < 0) {
        currentBlock.direction *= -1;
        // Korekta pozycji, jeśli wyszedł poza ekran
        currentBlock.x = Math.max(0, Math.min(currentBlock.x, stackerGameArea.offsetWidth - currentBlock.width));
    }

    renderMovingBlock(); // Użyj nowej funkcji

    animationFrameId = requestAnimationFrame(stackerGameLoop);
}

function endMoneyStackerGame() {
    isStackerGameOver = true;
    cancelAnimationFrame(animationFrameId); // Zatrzymaj pętlę animacji
    document.removeEventListener('keydown', handleStackerKeyPress); // Usuń listener

    const finalReward = Math.floor(stackerScore); // Zaokrąglij w dół

    if (finalReward > 0) {
        playerCash += finalReward;
        showToast(`Koniec gry! Zdobyłeś ${finalReward} PLN!`, 'success', 5000);
        logEvent(`💰 W minigrze "Wieża z Pieniędzy" zdobyto ${finalReward} PLN.`, 'review');
        displayCash();
    } else {
        showToast(`Koniec gry! Spróbuj jeszcze raz.`, 'default', 4000);
    }

    setTimeout(() => {
         const modal = document.getElementById('money-stacker-modal');
         if(modal) modal.style.display = 'none'; // Ukryj modal po czasie
         // Reset zmiennych na wszelki wypadek
         stackerGameArea = null;
         currentBlock = null;
         stack = [];
    }, 2000); // Zwiększony czas oczekiwania
}


// === NOWA FUNKCJA-PRZEŁĄCZNIK ===
function startRandomSpecialMinigame() {
    if (Math.random() < 0.5) {
        startDragEmployeeMinigame();
    } else {
        startMoneyStackerGame();
    }
}