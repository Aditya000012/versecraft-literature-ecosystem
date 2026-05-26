import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Book {
  bookId: string;
  title: string;
  authors: string | string[];
  thumbnail: string;
  infoLink: string;
}

interface ReadingList {
  id: string;
  name: string;
  books: Book[];
  createdAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json([]);
    }

    const data = userSnap.data();
    return NextResponse.json(data.readingLists || []);
  } catch (error) {
    console.error('Error fetching reading lists:', error);
    return NextResponse.json({ error: (error as Error).message || 'Error fetching reading lists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, name } = await request.json();

    if (!uid || !name) {
      return NextResponse.json({ error: 'UID and list name are required' }, { status: 400 });
    }

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    let readingLists: ReadingList[] = [];
    if (userSnap.exists()) {
      readingLists = userSnap.data().readingLists || [];
    } else {
      await setDoc(userRef, { readingLists: [] });
    }

    const newList: ReadingList = {
      id: Date.now().toString(),
      name,
      books: [],
      createdAt: new Date().toISOString(),
    };

    await updateDoc(userRef, {
      readingLists: [...readingLists, newList],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating reading list:', error);
    return NextResponse.json({ error: (error as Error).message || 'Error creating reading list' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { uid, listId, book } = await request.json();

    if (!uid || !listId || !book) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const readingLists: ReadingList[] = userSnap.data().readingLists || [];
    const updatedLists = readingLists.map((list) => {
      if (list.id === listId) {
        const books = list.books || [];
        const exists = books.some((b) => b.bookId === book.bookId);
        if (!exists) {
          return {
            ...list,
            books: [...books, book],
          };
        }
      }
      return list;
    });

    await updateDoc(userRef, {
      readingLists: updatedLists,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding book to reading list:', error);
    return NextResponse.json({ error: (error as Error).message || 'Error adding book' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { action, uid, listId, bookId } = await request.json();

    if (!uid || !listId || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const readingLists: ReadingList[] = userSnap.data().readingLists || [];
    let updatedLists: ReadingList[] = [];

    if (action === 'removeBook') {
      if (!bookId) {
        return NextResponse.json({ error: 'Book ID is required for removeBook' }, { status: 400 });
      }
      updatedLists = readingLists.map((list) => {
        if (list.id === listId) {
          const books = list.books || [];
          return {
            ...list,
            books: books.filter((b) => b.bookId !== bookId),
          };
        }
        return list;
      });
    } else if (action === 'deleteList') {
      updatedLists = readingLists.filter((list) => list.id !== listId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await updateDoc(userRef, {
      readingLists: updatedLists,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error performing delete operation on reading lists:', error);
    return NextResponse.json({ error: (error as Error).message || 'Error processing deletion' }, { status: 500 });
  }
}
