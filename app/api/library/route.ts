import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const genre = searchParams.get('genre');
  let searchQuery = '';
  if (query) {
    searchQuery = encodeURIComponent(query);
  } else if (genre) {
    searchQuery = encodeURIComponent(`subject:${genre}`);
  } else {
    searchQuery = encodeURIComponent('classic literature');
  }
  const url = `https://www.googleapis.com/books/v1/volumes?q=${searchQuery}&maxResults=20&printType=books&orderBy=relevance`;
  console.log('Fetching Google Books URL:', url);
  const response = await fetch(url);
  const data = await response.json();
  console.log('Google Books items count:', data.items?.length ?? 0);
  return NextResponse.json(data.items || []);
}
