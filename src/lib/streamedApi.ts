import { StreamSource } from './streamAggregator';
import type { Match } from '@/data/mockData';
import type { LeagueGroup } from '@/types/league';

// Streamed.pk API Configuration
// Free API, no authentication required
// Documentation: https://streamed.pk/docs
// Use proxy in dev to avoid CORS (Vite proxies /api/streamed → streamed.pk)
const STREAMED_API_BASE = import.meta.env.DEV ? '/api/streamed' : 'https://streamed.pk';

// Streamed API Types
interface StreamedTeam {
  name: string;
  badge?: string;
  logo?: string;
}

interface StreamedSource {
  source: string;
  id: string;
}

interface StreamedMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  teams: {
    home: StreamedTeam;
    away: StreamedTeam;
  };
  sources: StreamedSource[];
  league?: string;
  country?: string;
  sport?: string;
}

interface StreamedStreamResponse {
  streams?: Array<{
    url: string;
    embedUrl?: string;
    quality?: string;
    language?: string;
  }>;
  embed?: string;
  embedUrl?: string;
  url?: string;
  // Response might be an array
  [key: string]: any;
}

// Request cache
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache

const getCachedOrFetch = async (
  cacheKey: string,
  fetchFn: () => Promise<any>,
  cacheTime: number = CACHE_DURATION,
  skipCache = false
): Promise<any> => {
  const cached = requestCache.get(cacheKey);
  const now = Date.now();

  if (!skipCache && cached && now - cached.timestamp < cacheTime) {
    return cached.data;
  }

  try {
    const data = await fetchFn();
    requestCache.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (error) {
    if (cached) {
      return cached.data;
    }
    throw error;
  }
};

/** Clear Streamed cache */
export const clearStreamedCache = () => {
  for (const key of Array.from(requestCache.keys())) {
    if (key.startsWith('streamed:')) requestCache.delete(key);
  }
};

/**
 * Fetch live matches from Streamed.pk API
 * Endpoint: /api/matches/football
 * Documentation: https://streamed.pk/docs/matches
 */
export const getStreamedLiveMatches = async (skipCache = false): Promise<StreamedMatch[]> => {
  const cacheKey = 'streamed:live';

  return getCachedOrFetch(
    cacheKey,
    async () => {
      try {
        // Streamed.pk API endpoint for football matches
        const url = `${STREAMED_API_BASE}/api/matches/football`;
        console.log(`[Streamed] Fetching live matches from: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(`[Streamed] HTTP ${response.status} for ${url}`);
          return [];
        }

        const data = await response.json();
        console.log(`[Streamed] ✅ Success! Response:`, data);

        // Parse response - handle different structures
        let matches: StreamedMatch[] = [];
        if (Array.isArray(data)) {
          matches = data;
        } else if (data.matches && Array.isArray(data.matches)) {
          matches = data.matches;
        } else if (data.data && Array.isArray(data.data)) {
          matches = data.data;
        } else if (data.results && Array.isArray(data.results)) {
          matches = data.results;
        }

        // According to Streamed.pk docs: /api/matches/football returns all football matches
        // Filter for matches with teams and sources
        // Log full response structure for debugging
        console.log(`[Streamed] 📊 Total matches received: ${matches.length}`);
        if (matches.length > 0) {
          console.log(`[Streamed] First match structure:`, JSON.stringify(matches[0], null, 2));
        }
        
        const validMatches = matches.filter((m: any) => {
          // Check for teams - handle different structures
          const homeTeam = m.teams?.home?.name || m.teams?.home || m.homeTeam?.name || m.homeTeam;
          const awayTeam = m.teams?.away?.name || m.teams?.away || m.awayTeam?.name || m.awayTeam;
          const hasTeams = homeTeam && awayTeam;
          
          // Check for sources
          const hasSources = m.sources && Array.isArray(m.sources) && m.sources.length > 0;
          
          if (!hasTeams) {
            console.warn(`[Streamed] Match missing teams:`, m);
          }
          if (!hasSources) {
            console.warn(`[Streamed] Match missing sources:`, m.id || m.title);
          }
          
          return hasTeams && hasSources;
        });

        console.log(`[Streamed] ✅ Found ${validMatches.length} valid football matches with streams (out of ${matches.length} total)`);
        if (validMatches.length > 0) {
          console.log(`[Streamed] Sample valid match:`, JSON.stringify(validMatches[0], null, 2).substring(0, 800));
        } else if (matches.length > 0) {
          console.warn(`[Streamed] ⚠️ No valid matches found. First match structure:`, JSON.stringify(matches[0], null, 2));
        }
        return validMatches;
      } catch (error) {
        console.error('[Streamed] Error fetching live matches:', error);
        return [];
      }
    },
    30000,
    skipCache
  );
};

/**
 * Get streams for a specific match from Streamed.pk
 * Endpoint: /api/stream/{source}/{id}
 * Documentation: https://streamed.pk/docs/streams
 */
export const getStreamedStreams = async (
  source: string,
  id: string
): Promise<StreamedStreamResponse | null> => {
  const cacheKey = `streamed:stream:${source}:${id}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
      try {
        const url = `${STREAMED_API_BASE}/api/stream/${source}/${id}`;
        console.log(`[Streamed] Fetching streams from: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(`[Streamed] HTTP ${response.status} for stream ${source}/${id}`);
          return null;
        }

        const data = await response.json();
        console.log(`[Streamed] ✅ Stream data:`, data);
        return data;
      } catch (error) {
        console.error(`[Streamed] Error fetching streams:`, error);
        return null;
      }
    },
    60000
  );
};

/**
 * Extract streaming sources from Streamed match
 * According to docs: Need to fetch /api/stream/{source}/{id} to get actual embed URLs
 */
export const extractStreamedStreamSources = async (
  match: StreamedMatch
): Promise<StreamSource[]> => {
  const sources: StreamSource[] = [];
  const id = match.id;

  if (!match.sources || !Array.isArray(match.sources) || match.sources.length === 0) {
    console.warn(`[Streamed] No sources found for match ${id}`);
    return sources;
  }

  // Fetch actual stream URLs from /api/stream endpoint for each source
  for (const sourceItem of match.sources) {
    if (sourceItem.source && sourceItem.id) {
      try {
        const streamData = await getStreamedStreams(sourceItem.source, sourceItem.id);
        
        if (streamData) {
          // Stream response may contain embedUrl directly or streams array
          let embedUrl: string | null = null;
          
          // Try multiple locations for embed URL
          if (streamData.embedUrl) {
            embedUrl = streamData.embedUrl;
            console.log(`[Streamed] ✅ Got embedUrl from streamData.embedUrl`);
          } else if (streamData.embed) {
            embedUrl = streamData.embed;
            console.log(`[Streamed] ✅ Got embedUrl from streamData.embed`);
          } else if (streamData.url) {
            embedUrl = streamData.url;
            console.log(`[Streamed] ✅ Got embedUrl from streamData.url`);
          } else if (streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
            // If streams array, use first stream's URL
            const firstStream = streamData.streams[0];
            embedUrl = firstStream.embedUrl || firstStream.url || firstStream.embed || null;
            if (embedUrl) {
              console.log(`[Streamed] ✅ Got embedUrl from streams array`);
            }
          }
          
          if (embedUrl) {
            sources.push({
              source: sourceItem.source,
              id: sourceItem.id,
              provider: 'streamed',
              embedUrl,
            });
            console.log(`[Streamed] ✅ Added stream source ${sourceItem.source} with embed URL`);
          } else {
            // Fallback: try different embed URL formats
            const fallbackUrls = [
              `https://streamed.pk/embed/${sourceItem.source}/${sourceItem.id}`,
              `https://streamed.pk/watch/${sourceItem.source}/${sourceItem.id}`,
              `https://streamed.pk/player/${sourceItem.source}/${sourceItem.id}`,
            ];
            
            sources.push({
              source: sourceItem.source,
              id: sourceItem.id,
              provider: 'streamed',
              embedUrl: fallbackUrls[0], // Use first fallback
            });
            console.log(`[Streamed] ⚠️ No embed URL from API, using fallback: ${fallbackUrls[0]}`);
          }
        } else {
          // Fallback: construct embed URL if stream fetch fails
          const embedUrl = `https://streamed.pk/embed/${sourceItem.source}/${sourceItem.id}`;
          sources.push({
            source: sourceItem.source,
            id: sourceItem.id,
            provider: 'streamed',
            embedUrl,
          });
          console.log(`[Streamed] ⚠️ Stream fetch failed, using fallback: ${sourceItem.source}`);
        }
      } catch (error) {
        console.error(`[Streamed] Error fetching stream for ${sourceItem.source}/${sourceItem.id}:`, error);
        // Still add source with fallback URL
        const embedUrl = `https://streamed.pk/embed/${sourceItem.source}/${sourceItem.id}`;
        sources.push({
          source: sourceItem.source,
          id: sourceItem.id,
          provider: 'streamed',
          embedUrl,
        });
      }
    }
  }

  console.log(`[Streamed] ✅ Extracted ${sources.length} stream sources for match ${id}`);
  return sources;
};

/**
 * Parse minute from time string
 */
function parseMinuteFromTime(time: string | undefined): number | undefined {
  if (!time || typeof time !== 'string') return undefined;
  const t = time.trim();
  if (/^HT$/i.test(t)) return 45;
  if (/^\d+(\+\d+)?'?$/i.test(t)) {
    const m = t.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : undefined;
  }
  const numMatch = t.match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1], 10) : undefined;
}

function teamNameToShortName(name: string): string {
  if (!name) return '—';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
  }
  return name.slice(0, 3).toUpperCase();
}

/**
 * Map Streamed match to app Match format
 */
function streamedToAppMatch(
  m: StreamedMatch | any,
  streamSources: StreamSource[]
): Match {
  // Handle Streamed.pk API response structure from docs
  // teams: { home: { name, badge }, away: { name, badge } }
  const homeName = m.teams?.home?.name || m.teams?.home || 'Home';
  const awayName = m.teams?.away?.name || m.teams?.away || 'Away';
  const homeLogo = m.teams?.home?.badge || m.teams?.home?.logo || '';
  const awayLogo = m.teams?.away?.badge || m.teams?.away?.logo || '';

  // Extract scores - check multiple possible locations
  const homeScore = m.homeScore !== undefined ? m.homeScore : 
                    (m.score?.home !== undefined ? m.score.home : 
                    (m.scores?.home !== undefined ? m.scores.home : null));
  const awayScore = m.awayScore !== undefined ? m.awayScore : 
                    (m.score?.away !== undefined ? m.score.away : 
                    (m.scores?.away !== undefined ? m.scores.away : null));
  
  // Extract status and minute - check multiple possible locations
  let status: 'live' | 'upcoming' | 'finished' = 'live';
  let minute: number | undefined = undefined;
  
  // Check status field
  if (m.status === 'in' || m.status === 'live' || m.status === 'LIVE') {
    status = 'live';
  } else if (m.status === 'finished' || m.status === 'ft' || m.status === 'FT' || m.status === 'FINISHED') {
    status = 'finished';
  } else if (m.status === 'upcoming' || m.status === 'scheduled') {
    status = 'upcoming';
  } else if (streamSources.length > 0) {
    // If has streams, assume it's live
    status = 'live';
  }
  
  // Extract minute
  minute = m.currentMinuteNumber !== undefined ? m.currentMinuteNumber : 
           m.currentMinute !== undefined ? (typeof m.currentMinute === 'number' ? m.currentMinute : parseMinuteFromTime(String(m.currentMinute))) :
           m.minute !== undefined ? (typeof m.minute === 'number' ? m.minute : parseMinuteFromTime(String(m.minute))) :
           m.time !== undefined ? parseMinuteFromTime(String(m.time)) :
           undefined;
  
  // If status is "Half Time", set minute to 45
  if (m.status === 'HT' || m.status === 'half time' || String(m.status || '').toLowerCase().includes('half')) {
    minute = 45;
    status = 'live';
  }

  return {
    id: `streamed-${m.id}`,
    homeTeam: {
      id: `streamed-${m.id}-home`,
      name: homeName,
      shortName: teamNameToShortName(homeName),
      logo: homeLogo,
    },
    awayTeam: {
      id: `streamed-${m.id}-away`,
      name: awayName,
      shortName: teamNameToShortName(awayName),
      logo: awayLogo,
    },
    homeScore,
    awayScore,
    status,
    minute,
    competition: m.league || m.category || 'Football',
    venue: m.venue,
    startTime: m.date ? new Date(m.date).toLocaleTimeString() : undefined,
    streamSources: streamSources.length > 0 ? streamSources : undefined,
  };
}

/**
 * Fetch live matches from Streamed.pk and return LeagueGroup[]
 * Use this for Live TV page
 */
export const getStreamedLiveLeagueGroups = async (
  skipCache = false
): Promise<LeagueGroup[]> => {
  const matches = await getStreamedLiveMatches(skipCache);
  if (matches.length === 0) {
    console.log('[Streamed] No live matches, returning empty league groups');
    return [];
  }

  const matchRows: {
    match: Match;
    leagueKey: string;
    leagueName: string;
    country: string;
  }[] = [];

  // Process matches and fetch stream URLs
  for (const m of matches) {
    const streamSources = await extractStreamedStreamSources(m);
    
    // Include matches with streams
    if (streamSources.length === 0) {
      console.log(
        `[Streamed] Skip ${m.teams?.home?.name || m.teams?.home} vs ${m.teams?.away?.name || m.teams?.away} – no stream`
      );
      continue;
    }

    const appMatch = streamedToAppMatch(m, streamSources);
    // Streamed.pk may not provide league info in match list
    // Use category or default to Football
    const leagueName = m.league || m.category || 'Football';
    const country = m.country || '';
    const leagueKey = leagueName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    matchRows.push({
      match: appMatch,
      leagueKey: leagueKey || 'other',
      leagueName,
      country,
    });
  }

  const groupMap = new Map<
    string,
    { league: { id: string; name: string; country: string }; matches: Match[] }
  >();

  for (const row of matchRows) {
    const existing = groupMap.get(row.leagueKey);
    if (existing) {
      existing.matches.push(row.match);
    } else {
      groupMap.set(row.leagueKey, {
        league: { id: row.leagueKey, name: row.leagueName, country: row.country },
        matches: [row.match],
      });
    }
  }

  const groups: LeagueGroup[] = Array.from(groupMap.values()).map((g) => ({
    league: g.league,
    matches: g.matches,
  }));

  console.log(
    `[Streamed] Live TV: ${matchRows.length}/${matches.length} matches have streams, ${groups.length} leagues`
  );
  return groups;
};

/**
 * Fetch a single match by Streamed id
 */
export const getStreamedMatchById = async (realId: string): Promise<Match | null> => {
  // Streamed.pk doesn't have a direct match detail endpoint
  // We need to fetch all matches and find the one with matching ID
  const matches = await getStreamedLiveMatches();
  const match = matches.find((m) => m.id === realId);
  
  if (!match) {
    console.warn(`[Streamed] Match not found: ${realId}`);
    return null;
  }

  const streamSources = await extractStreamedStreamSources(match);
  return streamedToAppMatch(match, streamSources);
};

/**
 * Get streaming sources for a match from Streamed.pk
 */
export const getStreamedStreamSources = async (
  homeTeamName: string,
  awayTeamName: string
): Promise<StreamSource[]> => {
  try {
    console.log(`[Streamed] 🔍 Searching for: ${homeTeamName} vs ${awayTeamName}`);

    const liveMatches = await getStreamedLiveMatches();

    if (liveMatches.length === 0) {
      console.log('[Streamed] No live matches found');
      return [];
    }

    // Simple name matching
    const matchingMatch = liveMatches.find((m) => {
      const matchHome = (m.teams?.home?.name || '').toLowerCase();
      const matchAway = (m.teams?.away?.name || '').toLowerCase();
      const searchHome = homeTeamName.toLowerCase();
      const searchAway = awayTeamName.toLowerCase();
      
      return (matchHome.includes(searchHome) || searchHome.includes(matchHome)) &&
             (matchAway.includes(searchAway) || searchAway.includes(matchAway));
    });

    if (!matchingMatch) {
      console.log(`[Streamed] ❌ No match found for: ${homeTeamName} vs ${awayTeamName}`);
      return [];
    }

    console.log(
      `[Streamed] ✅ Found match: ${matchingMatch.teams?.home?.name} vs ${matchingMatch.teams?.away?.name}`
    );

    return await extractStreamedStreamSources(matchingMatch);
  } catch (error) {
    console.error('[Streamed] Error getting stream sources:', error);
    return [];
  }
};
