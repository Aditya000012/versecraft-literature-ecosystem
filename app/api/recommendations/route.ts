import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { genre, era, author, language } = await request.json();
    console.log('[Recommendations API] Received request with filters:', { genre, era, author, language });

    // Initialize Google GenAI client inside request handler
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
    });
    console.log('[Recommendations API] API Key present:', !!process.env.GEMINI_API_KEY);

    // 1. Call Gemini to generate a list of 6 book recommendations as JSON
    const prompt = `You are a legendary literary curator. Generate a list of exactly 6 book recommendations that perfectly match the reader's vibe:
- Genre: ${genre || 'Any'}
- Era: ${era || 'Any'}
- Author Vibe/Style: ${author || 'Any'}
- Language: ${language || 'English'}

Provide highly specific, diverse, and classical/insightful recommendations. For each book, generate the title, author, genre, era, and exactly one beautiful, poetic sentence explaining why it fits their vibe (poeticReason).
Ensure you only recommend real published books. Do not include mock titles.`;

    console.log('[Recommendations API] Prompting Gemini...');
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an elegant, classical librarian and poetic curator. Output a JSON object matching the requested schema. Write only a single poetic sentence explaining why each book fits the user's filters.`,
        temperature: 0.75,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            books: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  author: { type: 'string' },
                  genre: { type: 'string' },
                  era: { type: 'string' },
                  poeticReason: { type: 'string' }
                },
                required: ['title', 'author', 'genre', 'era', 'poeticReason']
              }
            }
          },
          required: ['books']
        }
      }
    });

    console.log('[Recommendations API] Gemini response received. Parsing...');
    const parsedData = JSON.parse(geminiResponse.text || '{}');
    const geminiBooks = parsedData.books || [];
    console.log(`[Recommendations API] Parsed ${geminiBooks.length} book recommendations from Gemini.`);

    // 2. Fetch covers and buy links from Google Books API for each book
    const combinedRecommendations = await Promise.all(
      geminiBooks.map(async (book: { title: string; author: string; genre?: string; era?: string; poeticReason: string }, idx: number) => {
        const { title, author, genre: bookGenre, era: bookEra, poeticReason } = book;
        const searchQuery = `${title} ${author}`;
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=1`;
        
        console.log(`[Recommendations API] [Book ${idx + 1}/${geminiBooks.length}] Fetching Google Books: "${title}" by ${author}`);
        
        try {
          const gbRes = await fetch(url);
          if (!gbRes.ok) {
            console.warn(`[Recommendations API] Google Books failed for "${title}" with status: ${gbRes.status}`);
            throw new Error(`Google Books status ${gbRes.status}`);
          }
          
          const gbData = await gbRes.json();
          const item = gbData.items?.[0];
          const info = item?.volumeInfo || {};
          
          console.log(`[Recommendations API] [Book ${idx + 1}/${geminiBooks.length}] Found Google Books volume ID: ${item?.id || 'none'}`);
          
          return {
            id: item?.id || `rec_${Math.random().toString(36).substring(2, 9)}`,
            title: title,
            author: author,
            genre: bookGenre || genre || 'Literature',
            era: bookEra || era || 'Classical',
            poeticReason: poeticReason,
            thumbnail: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80',
            infoLink: info.infoLink || `https://books.google.com/books?q=${encodeURIComponent(searchQuery)}`
          };
        } catch (err: unknown) {
          const e = err as Error;
          console.error(`[Recommendations API] [Book ${idx + 1}] Error fetching metadata for "${title}":`, e);
          return {
            id: `rec_${Math.random().toString(36).substring(2, 9)}`,
            title: title,
            author: author,
            genre: bookGenre || genre || 'Literature',
            era: bookEra || era || 'Classical',
            poeticReason: poeticReason,
            thumbnail: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80',
            infoLink: `https://books.google.com/books?q=${encodeURIComponent(searchQuery)}`
          };
        }
      })
    );

    console.log('[Recommendations API] Successfully merged all Gemini & Google Books data.');
    return NextResponse.json({ recommendations: combinedRecommendations });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Recommendations API] Critical error in route:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
