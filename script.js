// ===== Game State =====
console.log("🎮 Little Hero Dungeon script loaded!");
let conversationHistory = [];
let stars = 0;
let subject = '';

// ===== DOM Elements =====
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const startBtn = document.getElementById('start-btn');
const starsDisplay = document.getElementById('stars');
const storyText = document.getElementById('story-text');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const block = document.getElementById('dynamic-block');
const characterMouth = document.querySelector('.mouth');

// ===== Start Game =====
startBtn.addEventListener('click', () => {
    subject = document.getElementById('subject').value;
    const age = document.getElementById('age').value;

    // Switch screens
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');

    // Initialize the adventure
    conversationHistory = [];
    stars = 0;
    starsDisplay.textContent = stars;

    // Send initial prompt to start the adventure
    getNextGameStep(`Start a new adventure! I am ${age} years old and want to learn about ${subject}. Give me my first challenge.`);
});

// ===== Main Game Logic =====
async function getNextGameStep(userContent) {
    // UX: Show thinking state
    questionText.innerText = "The magic is happening...";
    optionsContainer.innerHTML = "";
    block.className = "block-character spinning";
    characterMouth.textContent = "🤔";

    conversationHistory.push({ role: "user", content: userContent });

    try {
        const response = await fetch('/.netlify/functions/game-master', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory,
                subject: subject,
                age: document.getElementById('age').value
            })
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        let gameData = await response.json();
        console.log("Raw response:", gameData);

        // Handle if response is wrapped in an array
        if (Array.isArray(gameData)) {
            gameData = gameData[0];
        }
        console.log("Game Data:", gameData);

        // Validate response has required fields
        if (!gameData.story || !gameData.question || !gameData.options) {
            console.error("Invalid response structure:", gameData);
            throw new Error("Invalid response from AI");
        }

        // 1. Update Story & Question
        storyText.innerText = gameData.story;
        questionText.innerText = gameData.question;

        // 2. Handle Dynamic Visuals (The "CSS Child")
        block.className = "block-character";

        // Add specific animation class requested by AI
        if (gameData.visual_cue) {
            block.classList.add(gameData.visual_cue);

            // Update character mood
            if (gameData.visual_cue.includes('happy') || gameData.visual_cue.includes('gold')) {
                characterMouth.textContent = "😄";
            } else if (gameData.visual_cue.includes('sad')) {
                characterMouth.textContent = "😢";
            } else if (gameData.visual_cue.includes('mysterious')) {
                characterMouth.textContent = "🤩";
            } else {
                characterMouth.textContent = "😊";
            }
        }

        // 3. Create Buttons
        gameData.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = opt;
            btn.onclick = () => handleChoice(opt, gameData.correct_answer);
            optionsContainer.appendChild(btn);
        });

        conversationHistory.push({ role: "assistant", content: JSON.stringify(gameData) });

    } catch (error) {
        console.error("Error:", error);
        questionText.innerText = `Error: ${error.message}. Check console for details.`;
        characterMouth.textContent = "😵";
        block.className = "block-character sad-shake";
    }
}

// ===== Handle Answer Selection =====
function handleChoice(selection, correct) {
    if (selection === correct) {
        stars += 10; // Big dopamine hit!
        starsDisplay.textContent = stars;

        // Celebration animation
        starsDisplay.style.transform = 'scale(1.5)';
        setTimeout(() => {
            starsDisplay.style.transform = 'scale(1)';
        }, 300);

        getNextGameStep(`I chose "${selection}". It was correct! Praise me enthusiastically and continue with the next challenge.`);
    } else {
        // Psychology: Do not deduct points - just encourage
        getNextGameStep(`I chose "${selection}". It was wrong. Give me a gentle hint (the answer is "${correct}") and ask the question again in a different way.`);
    }
}
