import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Author name is required' }, { status: 400 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are a literary encyclopedia. Provide detailed information about the author "${name}" in the following exact JSON format with no markdown, no backticks, no extra text, only valid JSON:
{
  "name": "full name",
  "born": "birth year and place",
  "died": "death year or 'Living'",
  "nationality": "nationality",
  "movement": "literary movement they belonged to",
  "biography": "3-4 paragraph biography covering their life, struggles, and literary journey",
  "majorWorks": ["work 1", "work 2", "work 3", "work 4", "work 5"],
  "influences": ["author they were influenced by 1", "author 2", "author 3"],
  "influenced": ["author they influenced 1", "author 2", "author 3"],
  "famousQuote": "one famous quote from their most well known work",
  "quoteSource": "title of the work the quote is from",
  "legacy": "2-3 sentences about their lasting impact on literature"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Clean potential markdown backticks/text around the JSON block if LLM included it
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    const parsedData = JSON.parse(cleanJson);
    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Error fetching author info:', error);
    return NextResponse.json({ error: 'Author not found' }, { status: 500 });
  }
}
