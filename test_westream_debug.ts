
import { getWeStreamLiveMatches } from './src/lib/westreamApi';
import { getStreamEmbedUrl } from './src/lib/westreamApi';

// Mock fetch for node environment if needed, but we can try running with ts-node/tsx if available.
// Or just use the browser context via RunCommand with a node script that uses native fetch (Node 18+)

async function test() {
  try {
    console.log('Fetching live matches...');
    const matches = await getWeStreamLiveMatches();
    console.log(`Found ${matches.length} matches.`);
    
    if (matches.length > 0) {
      // Check first 3 matches
      for (const match of matches.slice(0, 3)) {
        console.log(`Match: ${match.title}`);
        console.log('Sources:', match.sources);
        
        if (match.sources && match.sources.length > 0) {
          const source = match.sources[0];
          const url = getStreamEmbedUrl(source.source, source.id, 1);
          console.log('Embed URL:', url);
        }
        console.log('---');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
