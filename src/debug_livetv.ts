
import { getAggregatedLiveMatches } from './lib/liveTvAggregator';

// Mock import.meta.env for Node.js environment if needed
// but since we are running with tsx, let's see if it works.
// If it fails, we might need a workaround.

async function run() {
  try {
    console.log('Running getAggregatedLiveMatches...');
    const groups = await getAggregatedLiveMatches();
    console.log('Result count:', groups.length);
    if (groups.length > 0) {
        console.log('First group matches:', groups[0].matches.length);
        console.log('First match:', JSON.stringify(groups[0].matches[0], null, 2));
    }
  } catch (error) {
    console.error('Error details:', error);
  }
}

run();
