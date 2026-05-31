

const normalizeTitle = (title) => 
  title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const LOCAL_GUTENBERG_MAP = {
  'pride and prejudice': 1342,
  'frankenstein': 84,
  'dracula': 345,
};

function normalizeBookData(raw, source) {
  if (source === 'gutenberg') {
    const gBook = raw;
    const authors = (gBook.authors || []).map((a) => {
      if (a.name && a.name.includes(',')) {
        const parts = a.name.split(',');
        return `${parts[1].trim()} ${parts[0].trim()}`;
      }
      return a.name || 'Unknown Author';
    });

    const thumbnail = gBook.formats?.['image/jpeg'] || '';
    const epubUrl = gBook.formats?.['application/epub+zip'] || '';

    return {
      id: `gutenberg-${gBook.id}`,
      gutenbergId: gBook.id,
      source: 'gutenberg',
      publicDomain: !gBook.copyright,
      epubUrl: epubUrl,
      volumeInfo: {
        title: gBook.title || 'Untitled Work',
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        publisher: 'Project Gutenberg',
        publishedDate: 'Public Domain',
        description: gBook.summaries?.[0] || 'A classic masterpiece.',
        imageLinks: { thumbnail, smallThumbnail: thumbnail },
        categories: gBook.bookshelves || ['Classics'],
        infoLink: `https://www.gutenberg.org/ebooks/${gBook.id}`
      }
    };
  } else {
    const googleBook = raw;
    const info = googleBook.volumeInfo || {};
    return {
      id: googleBook.id,
      source: 'google',
      publicDomain: false,
      volumeInfo: {
        title: info.title || 'Untitled Work',
        authors: info.authors || ['Unknown Author'],
        publisher: info.publisher || 'Unknown Publisher',
        publishedDate: info.publishedDate || '',
        description: info.description || 'No description available.',
        imageLinks: {
          thumbnail: info.imageLinks?.thumbnail || '',
          smallThumbnail: info.imageLinks?.smallThumbnail || '',
        },
        categories: info.categories || ['Literature'],
        infoLink: info.infoLink || `https://books.google.com/books?id=${googleBook.id}`
      }
    };
  }
}

function mergeBookResults(googleBooks, gutenbergBooks) {
  const mergedList = [];
  const matchedGutenbergIds = new Set();
  
  googleBooks.forEach(gBook => {
    const normGoogleTitle = normalizeTitle(gBook.volumeInfo.title);
    
    const match = gutenbergBooks.find(gutBook => {
      if (!gutBook.gutenbergId || matchedGutenbergIds.has(gutBook.gutenbergId)) return false;
      
      const normGutTitle = normalizeTitle(gutBook.volumeInfo.title);
      const firstThreeGoogle = normGoogleTitle.split(' ').slice(0, 3).join(' ');
      const firstThreeGutenberg = normGutTitle.split(' ').slice(0, 3).join(' ');
      
      const titleMatch = normGutTitle.includes(normGoogleTitle) ||
                         normGoogleTitle.includes(normGutTitle) ||
                         firstThreeGoogle === firstThreeGutenberg;
                         
      if (!titleMatch) return false;
      
      const gAuthors = gBook.volumeInfo.authors || [];
      const gutAuthors = gutBook.volumeInfo.authors || [];
      if (gAuthors.length > 0 && gutAuthors.length > 0) {
        const primaryAuthor = gAuthors[0].toLowerCase();
        if (primaryAuthor.includes('various') || primaryAuthor.includes('anonymous')) {
          return true;
        }
        const authorWords = primaryAuthor.replace(/[^a-z\s]/g, '').split(' ').filter(w => w.length > 2);
        if (authorWords.length === 0) return true;
        return gutAuthors.some(ga => {
          const gaLower = ga.toLowerCase();
          return authorWords.some(word => gaLower.includes(word));
        });
      }
      return true;
    });

    if (match && match.gutenbergId) {
      matchedGutenbergIds.add(match.gutenbergId);
      mergedList.push({
        ...gBook,
        source: 'merged',
        gutenbergId: match.gutenbergId,
        publicDomain: match.publicDomain,
        epubUrl: match.epubUrl,
      });
    } else {
      mergedList.push(gBook);
    }
  });

  gutenbergBooks.forEach(gutBook => {
    if (gutBook.gutenbergId && !matchedGutenbergIds.has(gutBook.gutenbergId)) {
      mergedList.push(gutBook);
    }
  });

  return { mergedList, matchedGutenbergIds };
}

async function test(query) {
  console.log(`\n=== Testing query: "${query}" ===`);
  
  // Mock Google Books returned items for testing
  let googleItems = [];
  if (query === 'Carmilla') {
    googleItems = [
      {
        id: "google-carmilla",
        volumeInfo: {
          title: "Carmilla",
          authors: ["Sheridan Le Fanu"]
        }
      }
    ];
  } else if (query === 'The King in Yellow') {
    googleItems = [
      {
        id: "google-king-yellow",
        volumeInfo: {
          title: "The King in Yellow",
          authors: ["Robert W. Chambers"]
        }
      }
    ];
  }

  const gutenbergRes = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`)
    .then(r => r.json());

  const gutenbergItems = gutenbergRes.results || [];

  console.log(`Google Books returned: ${googleItems.length} items (Mocked).`);
  console.log(`Gutenberg returned: ${gutenbergItems.length} items.`);

  const normalizedGoogle = googleItems.map(b => normalizeBookData(b, 'google'));
  const normalizedGutenberg = gutenbergItems.map(b => normalizeBookData(b, 'gutenberg'));

  const { mergedList, matchedGutenbergIds } = mergeBookResults(normalizedGoogle, normalizedGutenberg);

  console.log('Merged Results:');
  mergedList.forEach(book => {
    console.log(`- Title: "${book.volumeInfo.title}" | Source: ${book.source} | GutenbergId: ${book.gutenbergId} | Authors: ${book.volumeInfo.authors.join(', ')}`);
  });
  console.log('Matched Gutenberg IDs:', Array.from(matchedGutenbergIds));
}

test('Carmilla').then(() => test('The King in Yellow'));
