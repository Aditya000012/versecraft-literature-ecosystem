import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const genre = searchParams.get('genre');

    let searchQuery = '';
    if (query && query.trim() !== '') {
      searchQuery = query.trim();
    } else if (genre && genre.trim() !== '') {
      searchQuery = `subject:${genre.trim()}`;
    } else {
      searchQuery = 'classic literature';
    }

    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=20&printType=books&orderBy=relevance&langRestrict=en`;

    console.log('Library API fetching:', url);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Google Books API error:', response.status, response.statusText);
      return NextResponse.json([]);
    }

    const data = await response.json();
    console.log('Google Books returned items:', data.totalItems, 'items count:', data.items?.length);

    return NextResponse.json(data.items || []);
  } catch (error) {
    console.error('Library route error:', error);
    return NextResponse.json([]);
  }
}
