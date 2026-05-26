import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Movement name is required' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are a literary encyclopedia. Provide detailed information about the literary movement called ${name} in the following exact JSON format with no markdown, no backticks, no extra text, only valid JSON:
{
  "name": "full movement name",
  "period": "time period e.g. 1880s to 1920s",
  "origin": "country or region of origin",
  "overview": "2-3 paragraph overview of the movement, its philosophy, what it stood for and against",
  "characteristics": ["key characteristic 1", "key characteristic 2", "key characteristic 3", "key characteristic 4", "key characteristic 5"],
  "majorAuthors": ["author 1", "author 2", "author 3", "author 4", "author 5"],
  "landmarkWorks": [
    {"title": "work title", "author": "author name", "year": "year"},
    {"title": "work title", "author": "author name", "year": "year"},
    {"title": "work title", "author": "author name", "year": "year"}
  ],
  "influenced": ["movement it influenced 1", "movement 2", "movement 3"],
  "influencedBy": ["movement that influenced it 1", "movement 2"],
  "famousQuote": "a famous quote that captures the spirit of this movement",
  "quoteAuthor": "who said it",
  "legacy": "2-3 sentences about the movement's lasting impact on literature"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Strip any markdown backticks or json wrapping before parsing
    const cleaned = responseText.replace(/```json|```/g, '').trim();

    const parsedData = JSON.parse(cleaned);
    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Error fetching movement details:', error);
    return NextResponse.json({ error: 'Movement not found' }, { status: 500 });
  }
}
