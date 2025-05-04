
import React, { useEffect, useRef, useState } from "react";

const LockpickGame: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!gameRef.current) return;
    
    // We need to inject the HTML and scripts dynamically since React doesn't allow direct script execution
    const injectGame = () => {
      const container = gameRef.current;
      if (!container) return;
      
      // Game container
      container.innerHTML = `
        <div class="container">
          <h2>Treino</h2>

          <div class="difficulty-selector">
            <label for="difficulty">Dificuldade: </label>
            <select id="difficulty">
              <option value="easy">Fácil (10 números)</option>
              <option value="medium" selected>Médio (15 números)</option>
              <option value="hard">Difícil (20 números)</option>
              <option value="extreme">Extremo (30 números)</option>
            </select>
          </div>

          <div class="game-container" id="game-area">
            <div class="countdown" id="countdown"></div>
            <div class="game-message" id="start-message">Clique para começar!</div>
            <div class="game-message success-message" id="success-message">FECHADURA ABERTA!</div>
            <div class="game-message failure-message" id="failure-message">ARROMBAMENTO FALHOU!</div>
          </div>

          <div class="hud">
            <div class="current-number">Próximo Número: <span id="current-number">1</span></div>

            <div class="progress-container">
              <div class="progress-label">Progresso:</div>
              <div class="progress-bar">
                <div class="progress" id="progress-bar"></div>
              </div>
              <div class="progress-value"><span id="progress-value">0</span>%</div>
            </div>
          </div>

          <div class="controls">
            <button id="start-btn">Iniciar</button>
            <button id="try-again-btn" style="display: none;">Tentar Novamente</button>
          </div>
        </div>
      `;

      // Inject the game logic
      initializeGameLogic();
    };
    
    const initializeGameLogic = () => {
      // Elements - using proper TypeScript casting
      const gameArea = document.getElementById('game-area');
      const progressBar = document.getElementById('progress-bar');
      const progressValue = document.getElementById('progress-value');
      const currentNumberDisplay = document.getElementById('current-number');
      const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
      const tryAgainBtn = document.getElementById('try-again-btn') as HTMLButtonElement;
      const successMessage = document.getElementById('success-message');
      const failureMessage = document.getElementById('failure-message');
      const startMessage = document.getElementById('start-message');
      const difficultySelector = document.getElementById('difficulty') as HTMLSelectElement;
      const countdown = document.getElementById('countdown');

      // Game variables
      let isPlaying = false;
      let currentNumber = 1;
      let totalNumbers = 15;
      let sequence: any[] = [];
      let visibleCircles: Record<string, any> = {};
      let timeoutIds: number[] = [];
      let connectorLines: HTMLElement[] = [];
      let circleState: Record<string, any> = {};

      // Game settings
      let difficulty = {
        totalNumbers: 30,
        circleSize: 90,
        approachRate: 1700,
        circleInterval: 900,
        minDistance: 90,
        maxVisibleCircles: 4,
        timingWindow: 0.05,
      };

      // Set difficulty
      function setDifficulty(difficultyLevel: string) {
        switch (difficultyLevel) {
          case 'easy':
            difficulty = {
              totalNumbers: 10,
              circleSize: 90,
              approachRate: 4000,
              circleInterval: 1000,
              minDistance: 110,
              maxVisibleCircles: 4,
              timingWindow: 0.07,
            };
            break;
          case 'medium':
            difficulty = {
              totalNumbers: 15,
              circleSize: 90,
              approachRate: 4000,
              circleInterval: 900,
              minDistance: 110,
              maxVisibleCircles: 4,
              timingWindow: 0.07,
            };
            break;
          case 'hard':
            difficulty = {
              totalNumbers: 20,
              circleSize: 90,
              approachRate: 4000,
              circleInterval: 900,
              minDistance: 110,
              maxVisibleCircles: 4,
              timingWindow: 0.07,
            };
            break;
          case 'extreme':
            difficulty = {
              totalNumbers: 30,
              circleSize: 90,
              approachRate: 2000,
              circleInterval: 900,
              minDistance: 110,
              maxVisibleCircles: 4,
              timingWindow: 0.07,
            };
            break;
        }
        totalNumbers = difficulty.totalNumbers;
      }

      // Start the game
      function startGame() {
        resetGame();
        if (difficultySelector) {
          setDifficulty(difficultySelector.value);
        }
        generateSequence();

        if (startMessage) startMessage.style.display = 'none';
        if (startBtn) startBtn.disabled = true;
        if (difficultySelector) difficultySelector.disabled = true;

        if (countdown) {
          countdown.style.display = 'block';
          countdown.textContent = '3';

          setTimeout(() => {
            if (countdown) countdown.textContent = '2';
            setTimeout(() => {
              if (countdown) countdown.textContent = '1';
              setTimeout(() => {
                if (countdown) countdown.textContent = 'VAI!';
                setTimeout(() => {
                  if (countdown) countdown.style.display = 'none';
                  startGameplay();
                }, 500);
              }, 1000);
            }, 1000);
          }, 1000);
        }
      }

      // Generate sequence of positions
      function generateSequence() {
        if (!gameArea) return;
        
        const gameWidth = gameArea.clientWidth;
        const gameHeight = gameArea.clientHeight;
        const margin = difficulty.circleSize;

        sequence = [];

        for (let i = 0; i < totalNumbers; i++) {
          let posX, posY;
          let isSafe = false;
          let attempts = 0;

          while (!isSafe && attempts < 100) {
            posX = Math.random() * (gameWidth - 2 * margin) + margin;
            posY = Math.random() * (gameHeight - 2 * margin) + margin;

            isSafe = true;

            for (let j = 0; j < sequence.length; j++) {
              const distance = Math.sqrt(
                Math.pow(posX - sequence[j].x, 2) +
                Math.pow(posY - sequence[j].y, 2)
              );

              if (distance < difficulty.minDistance) {
                isSafe = false;
                break;
              }
            }

            attempts++;
          }

          sequence.push({
            x: posX,
            y: posY,
            number: i + 1
          });
        }

        createConnectorLines();
      }

      // Create connector lines
      function createConnectorLines() {
        if (!gameArea) return;
        
        connectorLines.forEach(line => line.remove());
        connectorLines = [];

        for (let i = 0; i < sequence.length - 1; i++) {
          const startPoint = sequence[i];
          const endPoint = sequence[i + 1];

          const dx = endPoint.x - startPoint.x;
          const dy = endPoint.y - startPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;

          const line = document.createElement('div');
          line.className = 'connector-line';
          line.style.width = `${distance}px`;
          line.style.left = `${startPoint.x}px`;
          line.style.top = `${startPoint.y}px`;
          line.style.transform = `rotate(${angle}deg)`;
          line.style.opacity = '0';
          line.dataset.fromNumber = startPoint.number.toString();
          line.dataset.toNumber = endPoint.number.toString();

          gameArea.appendChild(line);
          connectorLines.push(line);
        }
      }

      // Show line
      function showLine(fromNumber: number) {
        const line = connectorLines.find(l =>
          parseInt(l.dataset.fromNumber || '0') === fromNumber
        );

        if (line) {
          line.style.opacity = '0.7';
        }
      }

      // Dim line
      function dimLine(fromNumber: number) {
        const line = connectorLines.find(l =>
          parseInt(l.dataset.fromNumber || '0') === fromNumber
        );

        if (line) {
          line.style.opacity = '0.3';
        }
      }

      // Start gameplay
      function startGameplay() {
        isPlaying = true;
        currentNumber = 1;
        if (currentNumberDisplay) currentNumberDisplay.textContent = currentNumber.toString();

        // Show first 4 numbers
        for (let i = 1; i <= Math.min(4, totalNumbers); i++) {
          showCircle(i);
        }
      }

      // Show circle
      function showCircle(number: number) {
        if (!isPlaying || number > totalNumbers || !gameArea) return;

        const index = number - 1;
        const circleData = sequence[index];
        
        // Calculate delay based on circle position (0 to 3)
        const circlePosition = (number - currentNumber) % 4;
        const closeDelay = difficulty.approachRate + (circlePosition * 300); // 300ms difference between each

        circleState[number] = {
          startTime: Date.now(),
          inTimingWindow: false,
          canClick: false,
          timingState: 'waiting',
          closeTime: closeDelay
        };

        // Approach circle
        const approachCircle = document.createElement('div');
        approachCircle.className = 'approach-circle';
        approachCircle.style.left = circleData.x + 'px';
        approachCircle.style.top = circleData.y + 'px';
        approachCircle.style.width = difficulty.circleSize * 3 + 'px';
        approachCircle.style.height = difficulty.circleSize * 3 + 'px';
        approachCircle.dataset.number = number.toString();
        gameArea.appendChild(approachCircle);

        // Main circle
        const circle = document.createElement('div');
        circle.className = 'circle';
        circle.textContent = number.toString();
        circle.dataset.number = number.toString();
        circle.style.left = circleData.x + 'px';
        circle.style.top = circleData.y + 'px';
        circle.style.width = difficulty.circleSize + 'px';
        circle.style.height = difficulty.circleSize + 'px';
        gameArea.appendChild(circle);

        approachCircle.style.transition = `width ${closeDelay}ms linear, height ${closeDelay}ms linear`;

        if (number > 1) {
          showLine(number - 1);
        }

        setTimeout(() => {
          approachCircle.style.width = difficulty.circleSize + 'px';
          approachCircle.style.height = difficulty.circleSize + 'px';
          circle.style.opacity = '1';

          circle.addEventListener('click', handleCircleClick);

          visibleCircles[number] = {
            circle: circle,
            approachCircle: approachCircle
          };

          monitorCircleTiming(number);
        }, 10);

        timeoutIds.push(window.setTimeout(() => {
          if (isPlaying && number === currentNumber) {
            missCircle();
          } else if (isPlaying && visibleCircles[number]) {
            removeCircle(number);
          }
        }, closeDelay + 500) as unknown as number); // +500ms tolerance
      }

      // Monitor circle timing
      function monitorCircleTiming(number: number) {
        if (!isPlaying || !visibleCircles[number]) return;

        const totalTime = circleState[number].closeTime;
        const startTime = circleState[number].startTime;
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        const progress = elapsedTime / totalTime;

        const perfectStart = 1 - difficulty.timingWindow;
        const perfectEnd = 1 + difficulty.timingWindow;

        if (progress >= perfectStart && progress <= perfectEnd) {
          if (!circleState[number].inTimingWindow) {
            circleState[number].inTimingWindow = true;
            circleState[number].canClick = true;
            circleState[number].timingState = 'perfect';

            if (number === currentNumber) {
              visibleCircles[number].circle.style.borderColor = '#f1c40f';
              visibleCircles[number].circle.style.boxShadow = '0 0 15px rgba(241, 196, 15, 0.8)';
            }
          }
        } else if (progress > perfectEnd) {
          if (circleState[number].inTimingWindow) {
            circleState[number].inTimingWindow = false;
            circleState[number].timingState = 'missed';

            if (visibleCircles[number]) {
              visibleCircles[number].circle.style.borderColor = '#2ecc71';
              visibleCircles[number].circle.style.boxShadow = '0 0 10px rgba(46, 204, 113, 0.5)';
            }

            if (number === currentNumber && isPlaying) {
              circleState[number].canClick = true;
            }
          }
        }

        if (isPlaying && visibleCircles[number] && progress < 1.2) {
          timeoutIds.push(window.setTimeout(() => {
            monitorCircleTiming(number);
          }, 16) as unknown as number);
        }
      }

      // Remove circle
      function removeCircle(number: number) {
        if (visibleCircles[number]) {
          visibleCircles[number].circle.remove();
          visibleCircles[number].approachCircle.remove();
          delete visibleCircles[number];
          delete circleState[number];
        }
      }

      // Handle click
      function handleCircleClick(e: Event) {
        if (!isPlaying) return;
        
        const target = e.target as HTMLElement;
        const clickedNumber = parseInt(target.dataset.number || '0');

        if (clickedNumber === currentNumber) {
          if (circleState[clickedNumber] && circleState[clickedNumber].canClick) {
            if (circleState[clickedNumber].timingState === 'perfect') {
              hitCircle('perfect');
            } else {
              hitCircle('good');
            }
          } else {
            missCircle();
          }
        } else if (clickedNumber < currentNumber) {
          removeCircle(clickedNumber);
        } else {
          missCircle();
        }
      }

      // Hit circle
      function hitCircle(quality = 'good') {
        if (!gameArea) return;
        
        if (currentNumber < totalNumbers) {
          dimLine(currentNumber);
        }

        const circleData = sequence[currentNumber - 1];

        if (quality === 'perfect') {
          showHitFeedback(circleData.x, circleData.y, 'perfect');
        } else {
          showHitFeedback(circleData.x, circleData.y, 'good');
        }

        removeCircle(currentNumber);
        currentNumber++;

        const progress = Math.min(100, Math.round(((currentNumber - 1) / totalNumbers) * 100));
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressValue) progressValue.textContent = progress.toString();

        if (currentNumber > totalNumbers) {
          endGame(true);
          return;
        }

        if (currentNumberDisplay) currentNumberDisplay.textContent = currentNumber.toString();

        // Show next number to keep 4 visible
        const nextNumberToShow = currentNumber + 3;
        if (nextNumberToShow <= totalNumbers && !visibleCircles[nextNumberToShow]) {
          showCircle(nextNumberToShow);
        }
      }

      // Miss circle
      function missCircle() {
        if (!gameArea) return;
        
        const circleData = sequence[currentNumber - 1];
        if (circleData) {
          showHitFeedback(circleData.x, circleData.y, 'miss');
        }
        endGame(false);
      }

      // Show hit feedback
      function showHitFeedback(x: number, y: number, type: string) {
        if (!gameArea) return;
        
        const feedback = document.createElement('div');
        feedback.className = 'hit-feedback';

        if (type === 'perfect') {
          feedback.classList.add('hit-perfect');
          feedback.textContent = '!';
        } else if (type === 'good') {
          feedback.classList.add('hit-good');
          feedback.textContent = '';
        } else {
          feedback.classList.add('hit-miss');
          feedback.textContent = '';
        }

        feedback.style.left = x + 'px';
        feedback.style.top = y + 'px';
        gameArea.appendChild(feedback);

        setTimeout(() => {
          feedback.style.opacity = '1';
          feedback.style.transform = 'translate(-50%, -80px)';

          setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => {
              feedback.remove();
            }, 500);
          }, 500);
        }, 10);
      }

      // End game
      function endGame(isSuccess: boolean) {
        isPlaying = false;
        timeoutIds.forEach(id => clearTimeout(id));
        timeoutIds = [];

        for (const number in visibleCircles) {
          if (visibleCircles.hasOwnProperty(number)) {
            visibleCircles[number].circle.remove();
            visibleCircles[number].approachCircle.remove();
          }
        }
        visibleCircles = {};
        circleState = {};

        if (tryAgainBtn) tryAgainBtn.style.display = 'inline-block';
        if (startBtn) startBtn.disabled = false;
        if (difficultySelector) difficultySelector.disabled = false;

        if (isSuccess) {
          if (successMessage) successMessage.style.display = 'block';
          setTimeout(() => {
            if (successMessage) successMessage.style.display = 'none';
          }, 3000);
        } else {
          if (failureMessage) failureMessage.style.display = 'block';
          setTimeout(() => {
            if (failureMessage) failureMessage.style.display = 'none';
          }, 3000);
        }
      }

      // Reset game
      function resetGame() {
        timeoutIds.forEach(id => clearTimeout(id));
        timeoutIds = [];

        for (const number in visibleCircles) {
          if (visibleCircles.hasOwnProperty(number)) {
            visibleCircles[number].circle.remove();
            visibleCircles[number].approachCircle.remove();
          }
        }
        visibleCircles = {};
        circleState = {};

        connectorLines.forEach(line => line.remove());
        connectorLines = [];

        if (gameArea) {
          const allCircles = gameArea.querySelectorAll('.circle, .approach-circle, .hit-feedback, .connector-line, .timing-indicator');
          allCircles.forEach(element => {
            element.remove();
          });
        }

        isPlaying = false;
        currentNumber = 1;
        sequence = [];

        if (currentNumberDisplay) currentNumberDisplay.textContent = currentNumber.toString();
        if (progressBar) progressBar.style.width = '0%';
        if (progressValue) progressValue.textContent = '0';

        if (successMessage) successMessage.style.display = 'none';
        if (failureMessage) failureMessage.style.display = 'none';
      }

      // Try again
      function tryAgain() {
        if (tryAgainBtn) tryAgainBtn.style.display = 'none';
        if (startMessage) startMessage.style.display = 'block';
      }

      // Event Listeners
      if (startBtn) startBtn.addEventListener('click', startGame);
      if (tryAgainBtn) tryAgainBtn.addEventListener('click', tryAgain);

      // Initialization
      setDifficulty('medium');
      if (startMessage) startMessage.style.display = 'block';
    };
    
    // Inject the game
    injectGame();
    
    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.innerHTML = '';
      }
    };
  }, []);
  
  return (
    <div className="lockpick-game">
      <style>
        {`
        .lockpick-game {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container {
          text-align: center;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }
        .game-container {
          width: 500px;
          height: 500px;
          margin: 0 auto;
          position: relative;
          border: 2px solid #444;
          background-color: rgba(0, 0, 0, 0.6);
          overflow: hidden;
        }
        .circle {
          position: absolute;
          border-radius: 50%;
          border: 3px solid #2ecc71;
          background-color: rgba(0, 0, 0, 0.7);
          transform: translate(-50%, -50%);
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 24px;
          font-weight: bold;
          color: white;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
          opacity: 0;
          transition: opacity 0.1s ease-in;
          z-index: 2;
        }
        .approach-circle {
          position: absolute;
          border-radius: 50%;
          border: 2px solid #2ecc71;
          background-color: transparent;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 1;
        }
        .connector-line {
          position: absolute;
          background-color: transparent;
          border-top: 2px solid #2ecc71;
          transform-origin: 0 0;
          z-index: 0;
          opacity: 0.7;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .hit-feedback {
          position: absolute;
          font-size: 20px;
          font-weight: bold;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: transform 0.5s ease-out, opacity 0.5s ease-out;
          pointer-events: none;
          text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
          z-index: 3;
        }
        .hit-perfect {
          color: #2ecc71;
        }
        .hit-good {
          color: #00f500;
        }
        .hit-miss {
          color: #e74c3c;
        }
        .hud {
          margin-top: 20px;
          color: white;
        }
        .progress-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
        }
        .progress-label {
          width: 100px;
          text-align: left;
        }
        .progress-bar {
          height: 10px;
          background-color: #444;
          flex-grow: 1;
          border-radius: 5px;
          overflow: hidden;
          margin: 0 10px;
        }
        .progress {
          height: 100%;
          background-color: #2ecc71;
          width: 0;
          transition: width 0.3s ease-out;
        }
        .progress-value {
          width: 50px;
          text-align: right;
        }
        .current-number {
          font-size: 28px;
          margin-top: 5px;
          color: #20fa04;
        }
        .controls {
          margin-top: 20px;
        }
        button {
          background-color: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 16px;
          cursor: pointer;
          border-radius: 5px;
          margin: 0 5px;
        }
        button:hover {
          background-color: #2980b9;
        }
        .game-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(52, 152, 219, 0.8);
          padding: 20px;
          border-radius: 10px;
          font-size: 24px;
          z-index: 10;
          display: none;
        }
        .success-message {
          background-color: rgba(46, 204, 113, 0.8);
        }
        .failure-message {
          background-color: rgba(231, 76, 60, 0.8);
        }
        .difficulty-selector {
          margin: 20px 0;
        }
        select {
          background-color: #444;
          color: white;
          padding: 5px 10px;
          border: none;
          border-radius: 5px;
        }
        .countdown {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 64px;
          font-weight: bold;
          z-index: 10;
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
        }
        .timing-indicator {
          position: absolute;
          font-size: 14px;
          color: #04fa25;
          transform: translate(-50%, -50%);
          opacity: 0;
          pointer-events: none;
          z-index: 3;
          text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
        }
        `}
      </style>
      <div ref={gameRef}></div>
    </div>
  );
};

export default LockpickGame;
