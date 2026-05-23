import Groq from 'groq-sdk';

export async function POST(request: Request) {
  try {
    const { message, mode, history, filters } = await request.json();

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
        systemPrompt = "You are a knowledgeable literary scholar and critic. When given a book title, author, poem, or pasted text, provide a thorough literary analysis covering: themes, character development, narrative structure, historical and cultural context, literary devices used, and the work's significance in literature. Write in clear, engaging prose like a passionate professor who loves their subject.";
        break;
      case 'judgement':
        systemPrompt = "You are a sharp literary critic. Give honest, direct, constructive critique of the user's writing. Identify weaknesses specifically, then suggest concrete improvements. Be fair but unflinching.";
        break;
      default:
        systemPrompt = "You are a warm literary companion. Discuss literature, authors, books, and writing in an engaging, knowledgeable way. Adapt your tone to the conversation.";
        break;
    }

    if (filters) {
      const genre = filters.genre || 'any';
      const era = filters.era || 'any';
      const authorStyle = filters.authorStyle || 'the era';
      systemPrompt = `The conversation is set in the ${genre} genre, ${era} era, in the style of ${authorStyle}. Respond accordingly in tone, vocabulary, and references.\n\n${systemPrompt}`;
    }

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (history && Array.isArray(history)) {
      history.forEach((msg: { role?: string; content?: string }) => {
        if (msg.content && msg.content !== 'BEGIN_SESSION') {
          messages.push({
            role: msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user',
            content: msg.content,
          });
        }
      });
    }

    if (message === 'BEGIN_SESSION') {
      messages.push({ role: 'user', content: 'Generate a warm, atmospheric opening greeting matching your persona. Do not exceed 3 sentences.' });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
    });

    return Response.json({ response: completion.choices[0].message.content });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error in /api/chat route:', err);
    return Response.json({ error: err?.message || 'An error occurred.' }, { status: 500 });
  }
}
