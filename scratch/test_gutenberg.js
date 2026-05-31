const https = require('https');

const normalizeTitle = (title) => 
  title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const testTitles = [
  "Frankenstein: Or, The Modern Prometheus",
  "Dracula",
  "The Picture of Dorian Gray",
  "The Odyssey",
  "Heart of Darkness"
];

function getUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(getUrl(res.headers.location));
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  for (const title of testTitles) {
    const searchTitle = title.split(/[:;\-\(]/)[0].trim() || title;
    console.log(`\n======================================================`);
    console.log(`Google Books Title: "${title}"`);
    console.log(`Clean Search Title: "${searchTitle}"`);
    
    try {
      const url = `https://gutendex.com/books/?search=${encodeURIComponent(searchTitle)}&languages=en`;
      console.log(`Querying: ${url}`);
      const data = await getUrl(url);
      const results = data.results || [];
      console.log(`Found ${results.length} results from Gutenberg.`);
      
      const googleTitle = normalizeTitle(searchTitle);
      
      const match = results.find((g) => {
        const gutenbergTitle = normalizeTitle(g.title);
        const matchResult = gutenbergTitle.includes(googleTitle) || 
                            googleTitle.includes(gutenbergTitle) ||
                            gutenbergTitle.split(' ').slice(0, 3).join(' ') === googleTitle.split(' ').slice(0, 3).join(' ');
        
        console.log(`  Comparing against: "${g.title}"`);
        console.log(`    - Gutenberg normalized: "${gutenbergTitle}"`);
        console.log(`    - Google normalized: "${googleTitle}"`);
        console.log(`    - Match status: ${matchResult}`);
        return matchResult;
      });
      
      console.log(`>>> MATCH FOUND:`, match ? `${match.title} (ID: ${match.id})` : "NONE");
    } catch (e) {
      console.error(`Error querying:`, e.message);
    }
  }
}

run();
