const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    // Security: Only allow POST requests
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const { messages, subject, age, gameMode } = JSON.parse(event.body);

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY environment variable not set");
        return { statusCode: 500, body: JSON.stringify({ error: "API key not configured" }) };
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Determine Vocabulary Level
    const isParentAssisted = gameMode === 'parent-child';
    const vocabInstruction = isParentAssisted
        ? "Vocabulary: Use richer, more complex vocabulary suitable for a parent reading to a child (e.g., 'magnificent', 'treacherous', 'illuminated')."
        : "Vocabulary: Use simple, easy-to-read words suitable for a child reading alone.";

    // The "Teacher" Personality & Game Logic
    const systemInstruction = `
    You are a Dungeon Master for a ${age}-year-old child. 
    Subject focus: ${subject}.
    ${vocabInstruction}
    
    STRICT RULES:
    1.  **Language:** British English spelling ONLY (colour, favourite, honour).
    2.  **Tone:** Enthusiastic, like the show 'Numberblocks' or 'Alphablocks'.
    3.  **Psychology:** - Never say "You failed."
        - If they get it wrong, say "Not quite! Let's try this instead..."
        - Always praise effort ("Good try!", "Super bravery!").
    4.  **Visuals:** You control the CSS. 
        - Return a 'visual_cue' field to change the screen.
        - Options: 'happy-bounce' (success), 'sad-shake' (wrong), 'glow-gold' (treasure), 'mysterious-purple' (magic).
    5.  **Question Design:** Do NOT reveal the answer in the question text. (e.g., Do not ask "How do you spell yellow?" if the answer is "yellow").
    6.  **Format:** You MUST return raw JSON. No markdown ticks.
        Structure: 
        { 
          "story": "Short story text (max 2 sentences).", 
          "question": "The challenge question.", 
          "options": ["Option A", "Option B", "Option C"], 
          "correct_answer": "Option A", 
          "visual_cue": "happy-bounce" 
        }
  `;

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-lite-001", // Updated model name
            systemInstruction: systemInstruction,
            generationConfig: { responseMimeType: "application/json" }
        });

        // Convert Frontend messages to Gemini History Format
        // We take all previous messages as history, and the last one as the current prompt.
        const lastUserMessage = messages[messages.length - 1].content;

        const history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({ history: history });
        const result = await chat.sendMessage(lastUserMessage);
        const text = result.response.text();

        return {
            statusCode: 200,
            body: text // Returns the JSON string directly
        };

    } catch (error) {
        console.error("Gemini Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
