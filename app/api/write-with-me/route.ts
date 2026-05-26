import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request: NextRequest) {
  try {
    const { userContribution, story, genre, tone, isFirstTurn } = await request.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `You are a collaborative fiction writer working with a human co-author. You are writing a story together, taking turns. The human writes a sentence or paragraph, then you write the next sentence or paragraph, then the human continues, and so on. Your role is to: 1) Continue naturally from exactly where the human left off, 2) Match and elevate their writing style, vocabulary level, and tone, 3) Never resolve the plot — always leave an opening for the human to continue, 4) Keep your contribution roughly the same length as the human's last contribution, 5) Never break the fourth wall or explain what you are doing — just write. Genre: ${genre}. Tone: ${tone}.`;

    let userPrompt = '';

    if (isFirstTurn && !userContribution) {
      userPrompt = "Generate an atmospheric opening sentence only — one sentence that sets a scene and ends on a moment of tension or mystery, leaving the human to continue. Write only this one sentence, nothing else.";
    } else {
      // Build the full story context from history and current contribution
      let fullStoryText = '';
      if (story && Array.isArray(story)) {
        fullStoryText = story
          .map((turn: { content: string }) => turn.content)
          .join(' ');
      }
      
      // Append the latest user contribution if it wasn't already in story array
      if (userContribution && !fullStoryText.endsWith(userContribution.trim())) {
        fullStoryText = fullStoryText ? `${fullStoryText} ${userContribution}` : userContribution;
      }

      userPrompt = `Here is our story so far: ${fullStoryText}. Continue from exactly where I left off with your next contribution. Write only your continuation, nothing else.`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 300,
    });

    const contribution = completion.choices[0]?.message?.content || '';
    return NextResponse.json({ contribution: contribution.trim() });
  } catch (error) {
    console.error('Write With Me alchemical co-writer error:', error);
    return NextResponse.json({ error: 'The muse stumbled' }, { status: 500 });
  }
}
