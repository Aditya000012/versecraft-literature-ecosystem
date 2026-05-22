import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { message, mode, history, filters } = await request.json();

    // Initialize Gemini inside the handler
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    // Build system prompt based on mode
    let systemPrompt = '';
    switch (mode) {
      case 'poetry':
        systemPrompt = "You are a lyrical poet. Respond only in expressive, vivid poetry. Use imagery, metaphor, and rhythm. Never respond in plain prose.";
        break;
      case 'duel':
        systemPrompt = "You are in a verse duel. The user writes a line or stanza, you respond with the next, matching or elevating their style. Keep the duel going turn by turn.";
        break;
      case 'story':
        systemPrompt = "You are a master novelist. When given a seed idea, write a rich, atmospheric opening paragraph in flowing prose. Make it cinematic and immersive.";
        break;
      case 'analysis':
        systemPrompt = "You are a knowledgeable literary scholar and critic. When given a book title, author, poem, or pasted text, provide a thorough literary analysis covering: themes, character development, narrative structure, historical and cultural context, literary devices used, and the work's significance in literature. Write in clear, engaging prose like a passionate professor who loves their subject. Be specific, insightful, and avoid vague generalizations.";
        break;
      case 'judgement':
        systemPrompt = "You are a sharp literary critic. Give honest, direct, constructive critique of the user's writing. Identify weaknesses specifically, then suggest concrete improvements. Be fair but unflinching.";
        break;
      default:
        systemPrompt = "You are a warm literary companion. Discuss literature, authors, books, and writing in an engaging, knowledgeable way. Adapt your tone to the conversation.";
        break;
    }

    // If filters exist, prepend to system prompt
    if (filters) {
      const genre = filters.genre || 'any';
      const era = filters.era || 'any';
      const authorStyle = filters.authorStyle || 'the era';
      systemPrompt = `The conversation is set in the ${genre} genre, ${era} era, in the style of ${authorStyle}. Respond accordingly in tone, vocabulary, and references.\n\n${systemPrompt}`;
    }

    // Build contents array from history plus new message
    const contents: { role: string; parts: { text: string }[] }[] = [];

    if (history && Array.isArray(history)) {
      history.forEach((msg: { role?: string; content?: string }) => {
        // Exclude previous BEGIN_SESSION system calls or placeholder greetings to keep history clean
        if (msg.content && msg.content !== 'BEGIN_SESSION') {
          contents.push({
            role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      });
    }

    // If message is "BEGIN_SESSION", we generate a warm custom opening greeting, but do NOT save it as a user message
    if (message === 'BEGIN_SESSION') {
      const welcomePrompt = `Generate a warm, atmospheric opening greeting or invitation matching your persona. DO NOT exceed 3 sentences.`;
      contents.push({
        role: 'user',
        parts: [{ text: welcomePrompt }],
      });
    } else {
      // Normal message
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });
    }

    // Call Gemini 2.5 Flash model as specified
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 1024,
      },
    });

    return Response.json({ response: response.text });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error in /api/chat route:', err);
    return Response.json(
      { error: err?.message || 'An error occurred during generative session.' },
      { status: 500 }
    );
  }
}
