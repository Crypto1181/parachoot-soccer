import { Match } from '@/data/mockData';
import { getWeStreamLiveMatches, findMatchingWeStreamMatch, WeStreamMatch, WeStreamSource, extractWeStreamStreamSources, getStreamEmbedUrl } from './westreamApi';

// Generic stream source interface
export interface StreamSource {
  source: string;
  id: string;
  provider?: string; // Which provider this came from
  embedUrl?: string; // Direct embed URL if available (for Streamed.pk and similar)
}

/**
 * Get stream URL for a given source and stream number
 * Unified function to get stream URLs from any provider
 */
export const getStreamUrl = async (source: StreamSource, streamNo: number = 1): Promise<string> => {
  // Handle WeStream provider
  if (source.provider === 'westream') {
    return getStreamEmbedUrl(source.source, source.id, streamNo);
  }
  
  // Handle Streamed.pk provider
  if (source.provider === 'streamed') {
    // If we have an embed URL, use it
    if (source.embedUrl) return source.embedUrl;
    
    // Otherwise construct it (assuming standard format)
    // Streamed.pk usually uses the ID directly
    return `https://streamed.su/watch/${source.id}`;
  }
  
  // Default: return embedUrl if available
  if (source.embedUrl) {
    return source.embedUrl;
  }
  
  return '';
};

// Generic match with streams interface
interface StreamMatch {
  id: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  sources: StreamSource[];
  provider: string;
}

/**
 * Try to find streams from multiple sources
 * Returns all found sources from all providers (Now WeStream Only)
 */
export const findStreamsFromAllSources = async (
  homeTeamName: string,
  awayTeamName: string
): Promise<StreamSource[]> => {
  const allSources: StreamSource[] = [];

  // Search WeStream Only
  try {
    console.log(`[StreamAggregator] 🔍 Searching WeStream for: ${homeTeamName} vs ${awayTeamName}`);
    const westreamMatches = await getWeStreamLiveMatches();
    const matchingStream = findMatchingWeStreamMatch(homeTeamName, awayTeamName, westreamMatches);
    
    if (matchingStream) {
      const streams = await extractWeStreamStreamSources(matchingStream);
      if (streams.length > 0) {
        allSources.push(...streams);
        console.log(`[StreamAggregator] ✅ Found ${streams.length} streams from WeStream`);
      }
    }
  } catch (error) {
    console.error('[StreamAggregator] ❌ WeStream error:', error);
  }

  return allSources;
};

/**
 * Enriches a match object with streams from WeStream
 */
export const enrichMatchWithMultipleStreamSources = async (match: Match): Promise<Match> => {
  if (!match.homeTeam.name || !match.awayTeam.name) {
    return match;
  }
  
  const streams = await findStreamsFromAllSources(match.homeTeam.name, match.awayTeam.name);
  
  if (streams.length > 0) {
    return {
      ...match,
      streamSources: streams
    };
  }
  
  return match;
};
