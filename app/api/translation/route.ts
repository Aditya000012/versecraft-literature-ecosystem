import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage, preserveStyle } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = "You are a master literary translator with deep knowledge of world literature. Your translations preserve not just meaning but rhythm, tone, imagery, and literary style. You understand what makes each language unique and what inevitably gets lost or transformed in translation.";

    const userPrompt = `Translate the following text from ${sourceLanguage || 'Auto Detect'} to ${targetLanguage}. ${preserveStyle ? 'Preserve the literary style, rhythm, and tone as closely as possible.' : 'Prioritize clarity and natural flow in the target language.'} After the translation, provide a brief section called TRANSLATOR'S NOTE that explains: 1) what literary elements were preserved, 2) what was inevitably lost or changed in translation, 3) any interesting linguistic or cultural nuances the reader should know about. Also identify the source language of the text. Add one line at the very end of your response in this exact format: DETECTED_LANGUAGE: [language name in English]. Format your response exactly as: TRANSLATION: [the translated text] TRANSLATOR'S NOTE: [your notes] Text to translate: ${text}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2048,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse detected language and remove it from the content
    let detectedLanguage = '';
    const detectedKey = 'DETECTED_LANGUAGE:';
    const detectedIndex = responseText.indexOf(detectedKey);
    let cleanResponseText = responseText;
    if (detectedIndex !== -1) {
      detectedLanguage = responseText.slice(detectedIndex + detectedKey.length).trim();
      detectedLanguage = detectedLanguage.replace(/[\[\]\.]/g, '').trim();
      cleanResponseText = responseText.slice(0, detectedIndex).trim();
    }

    // Split response to separate translation from translator's note
    let translation = '';
    let translatorsNote = '';

    const splitKeys = ["TRANSLATOR'S NOTE:", "Translator's Note:", "TRANSLATOR'S NOTE", "Translator's Note"];
    let splitIndex = -1;
    let foundKey = "";

    for (const key of splitKeys) {
      const idx = cleanResponseText.indexOf(key);
      if (idx !== -1) {
        splitIndex = idx;
        foundKey = key;
        break;
      }
    }

    if (splitIndex !== -1) {
      const beforeNote = cleanResponseText.slice(0, splitIndex).trim();
      const afterNote = cleanResponseText.slice(splitIndex + foundKey.length).trim();

      // Clean up "TRANSLATION:" prefix if present
      translation = beforeNote.replace(/^TRANSLATION:\s*/i, '').trim();
      translatorsNote = afterNote;
    } else {
      translation = cleanResponseText.replace(/^TRANSLATION:\s*/i, '').trim();
      translatorsNote = "No translator's note was generated.";
    }

    return NextResponse.json({ translation, translatorsNote, detectedLanguage });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
