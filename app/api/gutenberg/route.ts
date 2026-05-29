import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const bookId = searchParams.get('bookId');
    const query = searchParams.get('query');
    const topic = searchParams.get('topic');

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 });
    }

    if (action === 'search') {
      let gutUrl = 'https://gutendex.com/books/?languages=en';
      if (query) {
        gutUrl += `&search=${encodeURIComponent(query)}`;
      } else if (topic) {
        gutUrl += `&topic=${encodeURIComponent(topic)}`;
      }
      
      const page = searchParams.get('page');
      if (page) {
        gutUrl += `&page=${page}`;
      }
      
      const sort = searchParams.get('sort');
      if (sort) {
        gutUrl += `&sort=${sort}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500); // 6.5s timeout
      
      try {
        const res = await fetch(gutUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error('Gutendex search failed');
        const data = await res.json();
        
        return NextResponse.json({
          count: data.count || 0,
          next: data.next ? true : false,
          previous: data.previous ? true : false,
          results: data.results || []
        });
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn(`Gutendex search timeout or failure for URL "${gutUrl}":`, err);
        return NextResponse.json({ count: 0, next: false, previous: false, results: [] });
      }
    }

    if (action === 'book') {
      if (!bookId) {
        return NextResponse.json({ error: 'BookId is required for book metadata' }, { status: 400 });
      }
      const res = await fetch(`https://gutendex.com/books/${bookId}`);
      if (!res.ok) throw new Error('Gutendex book fetch failed');
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'read') {
      if (!bookId) {
        return NextResponse.json({ error: 'BookId is required for read' }, { status: 400 });
      }
      // 1. Fetch book metadata
      const res = await fetch(`https://gutendex.com/books/${bookId}`);
      if (!res.ok) throw new Error('Gutendex book fetch failed');
      const book = await res.json();

      // 2. Find HTML format URL
      const formats = book.formats || {};
      const htmlKey = Object.keys(formats).find(key => key.toLowerCase().includes('text/html'));
      if (!htmlKey) {
        throw new Error('HTML format not available for this volume');
      }

      const htmlUrl = formats[htmlKey];
      
      // 3. Fetch HTML content
      const htmlRes = await fetch(htmlUrl);
      if (!htmlRes.ok) throw new Error('Failed to fetch volume HTML content');
      const htmlContent = await htmlRes.text();

      const authorName = book.authors?.[0]?.name || 'Unknown Author';

      return NextResponse.json({
        html: htmlContent,
        title: book.title || 'Untitled Volume',
        author: authorName
      });
    }

    if (action === 'popular') {
      const page = searchParams.get('page') || '1';
      const gutUrl = `https://gutendex.com/books/?languages=en&sort=popular&page=${page}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);
      
      try {
        const res = await fetch(gutUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Gutendex popular fetch failed');
        const data = await res.json();
        return NextResponse.json({
          count: data.count || 0,
          next: data.next ? true : false,
          previous: data.previous ? true : false,
          results: data.results || []
        });
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn('Gutendex popular error:', err);
        return NextResponse.json({ count: 0, next: false, previous: false, results: [] });
      }
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error) {
    console.error('Gutenberg API route error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
