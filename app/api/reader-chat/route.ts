import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

interface ChatMessage {
  role: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      selectedText,
      bookTitle,
      bookAuthor,
      chapterContext,
      conversation
    } = await request.json();

    if (!message || !bookTitle || !bookAuthor) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('Groq API key not configured');
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Build context-aware system prompt utilizing the current chapterContext
    const activeChapterText = chapterContext ? ` (specifically, the section/chapter: "${chapterContext}")` : '';
    const systemPrompt = `You are a literary companion assisting a reader who is currently reading '${bookTitle}' by ${bookAuthor}${activeChapterText}. You have deep knowledge of this work — its themes, characters, historical context, literary significance, and author's life. When the reader shares a passage or asks about the text, provide insightful, engaging literary analysis. Be conversational and warm, like a knowledgeable friend reading alongside them. Never summarize beyond what the reader has already read. Never spoil upcoming plot points.`;

    // Construct user message with optional selected text prepended
    const userMessageContent = selectedText
      ? `Regarding this passage: "${selectedText}" — ${message}`
      : message;

    // Build conversation history with strict types matching Groq requirements
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.map((msg: ChatMessage) => ({
        role: (msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userMessageContent }
    ];

    // Call Groq
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in reader-chat API:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
