import { Match } from '@/data/mockData';
import { LeagueGroup } from '@/types/league';
import { StreamSource } from './streamAggregator';

// WeStream API Types
interface WeStreamTeam {
  name: string;
  badge?: string;
  logo?: string;
}

interface WeStreamSource {
  source: string;
  id: string;
}

interface WeStreamMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  popular: boolean;
  teams: {
    home: WeStreamTeam;
    away: WeStreamTeam;
  };
  sources: WeStreamSource[];
  league?: string;
  country?: string;
  sport?: string;
  status?: string;
  homeScore?: number;
  awayScore?: number;
  minute?: number;
  currentMinute?: number | string;
}

// API Configuration
// Try direct API first, fallback to proxy if CORS fails
// Use proxy in dev to avoid CORS (Vite proxies /api/westream → westream.su)
const WESTREAM_API_BASE = 'https://westream.su';
const WESTREAM_PROXY_BASE = '/api/westream';

// Request cache
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache

// Helper to get cached data or fetch new
const getCachedOrFetch = async (cacheKey: string, fetchFn: () => Promise<any>, cacheTime: number = CACHE_DURATION): Promise<any> => {
  const cached = requestCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < cacheTime) {
    return cached.data;
  }

  try {
    const data = await fetchFn();
    requestCache.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (error) {
    // If fetch fails and we have cached data, return it
    if (cached) {
      return cached.data;
    }
    throw error;
  }
};

/**
 * Fetch all live matches from WeStream
 * Endpoint: GET /matches/live
 * Documentation: https://westream.su/
 */
export const getWeStreamLiveMatches = async (skipCache = false): Promise<WeStreamMatch[]> => {
  const cacheKey = 'westream:live_combined';

  return getCachedOrFetch(cacheKey, async () => {
    // 1. Fetch from /matches/live (Curated/Top Live)
    let liveMatches: WeStreamMatch[] = [];
    try {
      // Try proxy first, then direct
      const endpoints = [`${WESTREAM_PROXY_BASE}/matches/live`, `${WESTREAM_API_BASE}/matches/live`];
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) liveMatches = data;
            else if (data.matches && Array.isArray(data.matches)) liveMatches = data.matches;
            if (liveMatches.length > 0) break;
          }
        } catch (e) { console.warn(`[WeStream] Failed to fetch live from ${url}`, e); }
      }
    } catch (e) { console.error('[WeStream] Error fetching live matches', e); }

    // Filter out non-football matches from curated list
    const isSoccer = (m: WeStreamMatch) => {
      const sport = (m.sport || m.category || '').toLowerCase();
      // Explicitly exclude other sports
      const excluded = [
        'basketball', 'tennis', 'cricket', 'baseball', 'american-football', 
        'rugby', 'hockey', 'volleyball', 'handball', 'table-tennis', 
        'badminton', 'darts', 'snooker', 'futsal', 'boxing', 'mma', 
        'motorsport', 'cycling', 'golf', 'esports'
      ];
      
      if (excluded.some(s => sport.includes(s))) return false;
      return true;
    };

    liveMatches = liveMatches.filter(isSoccer);

    // 2. Fetch from /matches (All matches - comprehensive)
    let allMatches: WeStreamMatch[] = [];
    try {
       // Try proxy first, then direct
       const endpoints = [`${WESTREAM_PROXY_BASE}/matches`, `${WESTREAM_API_BASE}/matches`];
       for (const url of endpoints) {
         try {
           const res = await fetch(url);
           if (res.ok) {
             const data = await res.json();
             if (Array.isArray(data)) allMatches = data;
             else if (data.matches && Array.isArray(data.matches)) allMatches = data.matches;
             if (allMatches.length > 0) break;
           }
         } catch (e) { console.warn(`[WeStream] Failed to fetch all from ${url}`, e); }
       }
    } catch (e) { console.error('[WeStream] Error fetching all matches', e); }

    console.log(`[WeStream] Fetched: Live(${liveMatches.length}), All(${allMatches.length})`);

    // 3. Filter "All Matches" for potential live events
    // WeStream dates are Unix timestamps (ms) or ISO strings
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    
    const relevantFromAll = allMatches.filter(m => {
      // Filter out non-football matches
      if (!isSoccer(m)) return false;

      // Check status
      const status = (m.status || '').toLowerCase();
      if (status === 'live' || status === 'in-play') return true;
      
      // Check date (if within last 2 hours or next 15 mins)
      if (m.date) {
        const matchTime = new Date(m.date).getTime();
        
        // Different sports have different durations
        // Cricket/Tennis matches can last much longer
        const category = (m.category || '').toLowerCase();
        let durationWindow = 3 * 60 * 60 * 1000; // Default 3 hours
        
        // No need to check for cricket/tennis/basketball since we filtered them out
        // But keeping logic just in case user changes their mind or we relax filter later
        if (category === 'cricket' || category === 'tennis' || category === 'baseball') {
          durationWindow = 12 * 60 * 60 * 1000; // 12 hours for long sports
        } else if (category === 'basketball' || category === 'american-football') {
          durationWindow = 4 * 60 * 60 * 1000; // 4 hours
        }

        // If match started within the window
        if (matchTime > now - durationWindow && matchTime < now + (30 * 60 * 1000)) {
          return true;
        }
      }
      return false;
    });

    // 4. Merge and Deduplicate
    const combinedMap = new Map<string, WeStreamMatch>();
    
    // Add curated live matches first (priority)
    liveMatches.forEach(m => combinedMap.set(m.id, m));
    
    // Add relevant matches from full list
    relevantFromAll.forEach(m => {
      if (!combinedMap.has(m.id)) {
        combinedMap.set(m.id, m);
      }
    });
    
    const combined = Array.from(combinedMap.values());
    console.log(`[WeStream] ✅ Merged unique live matches: ${combined.length}`);
    
    return combined;

  }, 30000, skipCache); // 30 seconds cache
};

/**
 * Fetch all matches from WeStream
 * Endpoint: GET /matches
 * Documentation: https://westream.su/
 */
export const getWeStreamAllMatches = async (skipCache = false): Promise<WeStreamMatch[]> => {
  const cacheKey = 'westream:all';

  return getCachedOrFetch(cacheKey, async () => {
    const endpoint = '/matches';

    try {
      const url = `${WESTREAM_API_BASE}${endpoint}`;
      console.log(`[WeStream] Fetching all matches from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[WeStream] HTTP ${response.status} for ${endpoint}`);
        return [];
      }

      const data = await response.json();

      let matches: WeStreamMatch[] = [];
      if (Array.isArray(data)) {
        matches = data;
      } else if (data.matches && Array.isArray(data.matches)) {
        matches = data.matches;
      } else if (data.data && Array.isArray(data.data)) {
        matches = data.data;
      }

      console.log(`[WeStream] ✅ Found ${matches.length} total matches`);
      return matches;
    } catch (error) {
      console.error('[WeStream] Error fetching all matches:', error);
      return [];
    }
  }, 60000, skipCache); // 1 minute cache for all matches
};

/**
 * Fetch matches for a specific sport from WeStream
 * Endpoint: GET /matches/:sport
 * Documentation: https://westream.su/
 */
export const getWeStreamMatchesBySport = async (sport: string, skipCache = false): Promise<WeStreamMatch[]> => {
  const cacheKey = `westream:sport:${sport}`;

  return getCachedOrFetch(cacheKey, async () => {
    const endpoint = `/matches/${sport}`;

    try {
      const url = `${WESTREAM_API_BASE}${endpoint}`;
      console.log(`[WeStream] Fetching ${sport} matches from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[WeStream] HTTP ${response.status} for ${endpoint}`);
        return [];
      }

      const data = await response.json();

      let matches: WeStreamMatch[] = [];
      if (Array.isArray(data)) {
        matches = data;
      } else if (data.matches && Array.isArray(data.matches)) {
        matches = data.matches;
      } else if (data.data && Array.isArray(data.data)) {
        matches = data.data;
      }

      console.log(`[WeStream] ✅ Found ${matches.length} ${sport} matches`);
      return matches;
    } catch (error) {
      console.error(`[WeStream] Error fetching ${sport} matches:`, error);
      return [];
    }
  }, 60000, skipCache); // 1 minute cache
};

/**
 * Get list of available sports from WeStream
 * Endpoint: GET /sports
 * Documentation: https://westream.su/
 */
export const getWeStreamSports = async (skipCache = false): Promise<string[]> => {
  const cacheKey = 'westream:sports';

  return getCachedOrFetch(cacheKey, async () => {
    const endpoint = '/sports';

    try {
      const url = `${WESTREAM_API_BASE}${endpoint}`;
      console.log(`[WeStream] Fetching sports list from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[WeStream] HTTP ${response.status} for ${endpoint}`);
        return [];
      }

      const data = await response.json();

      let sports: string[] = [];
      if (Array.isArray(data)) {
        sports = data;
      } else if (data.sports && Array.isArray(data.sports)) {
        sports = data.sports;
      } else if (data.data && Array.isArray(data.data)) {
        sports = data.data;
      }

      console.log(`[WeStream] ✅ Found ${sports.length} sports:`, sports);
      return sports;
    } catch (error) {
      console.error('[WeStream] Error fetching sports:', error);
      return [];
    }
  }, 300000, skipCache); // 5 minutes cache (sports list doesn't change often)
};

/**
 * Get streaming sources for a specific match
 */
export const getStreamSources = async (matchId: string): Promise<WeStreamSource[]> => {
  const matches = await getWeStreamLiveMatches();
  const match = matches.find(m => m.id === matchId);
  return match?.sources || [];
};

/**
 * Get stream embed URL
 * Format: https://westream.su/embed/{source}/{id}/{streamNo}
 */
export const getStreamEmbedUrl = (source: string, id: string, streamNo: number = 1): string => {
  return `https://westream.su/embed/${source}/${id}/${streamNo}`;
};

/**
 * Get stream details from WeStream
 * Endpoint: GET /stream/:source/:id
 * Documentation: https://westream.su/
 * Returns stream information including embed URLs and quality options
 */
export const getWeStreamStreamInfo = async (source: string, id: string, skipCache = false): Promise<any> => {
  const cacheKey = `westream:stream:${source}:${id}`;

  return getCachedOrFetch(cacheKey, async () => {
    const endpoint = `/stream/${source}/${id}`;

    try {
      const url = `${WESTREAM_API_BASE}${endpoint}`;
      console.log(`[WeStream] Fetching stream info from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[WeStream] HTTP ${response.status} for stream ${source}/${id}`);
        return null;
      }

      const data = await response.json();
      console.log(`[WeStream] ✅ Stream info:`, data);
      return data;
    } catch (error) {
      console.error(`[WeStream] Error fetching stream info:`, error);
      return null;
    }
  }, 60000, skipCache); // 1 minute cache for stream info
};

/**
 * Extract streaming sources from WeStream match
 * Also fetches stream details from /stream/:source/:id endpoint to get actual embed URLs
 */
export const extractWeStreamStreamSources = async (match: WeStreamMatch): Promise<StreamSource[]> => {
  const sources: StreamSource[] = [];

  if (!match.sources || !Array.isArray(match.sources) || match.sources.length === 0) {
    console.warn(`[WeStream] No sources found for match ${match.id}`);
    return sources;
  }

  // For now, use constructed embed URLs directly (WeStream embed format)
  // The /stream/:source/:id endpoint may not always be available or may return different format
  // Using the standard embed URL format: https://westream.su/embed/{source}/{id}/{streamNo}
  for (const sourceItem of match.sources) {
    if (sourceItem.source && sourceItem.id) {
      // Use constructed embed URL - WeStream uses this format
      const embedUrl = getStreamEmbedUrl(sourceItem.source, sourceItem.id, 1);

      sources.push({
        source: sourceItem.source,
        id: sourceItem.id,
        provider: 'westream',
        embedUrl,
      });
      console.log(`[WeStream] ✅ Extracted stream source: ${sourceItem.source} (${sourceItem.id})`);
    }
  }

  console.log(`[WeStream] ✅ Extracted ${sources.length} stream sources for match ${match.id}`);
  return sources;
};

/**
 * Parse minute from time string or number
 */
function parseMinuteFromTime(time: string | number | undefined): number | undefined {
  if (time === undefined || time === null) return undefined;
  if (typeof time === 'number') return time;
  if (typeof time !== 'string') return undefined;

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
 * Map WeStream match to app Match format
 * Extracts ALL data from WeStream API response - handles ANY structure
 */
function westreamToAppMatch(m: WeStreamMatch | any, streamSources: StreamSource[]): Match {
  // Extract team names from ANY possible structure
  let homeName = m.teams?.home?.name || m.teams?.home ||
    m.homeTeam?.name || m.homeTeam ||
    m.home?.name || m.home ||
    m.home_team?.name || m.home_team;
    
  let awayName = m.teams?.away?.name || m.teams?.away ||
    m.awayTeam?.name || m.awayTeam ||
    m.away?.name || m.away ||
    m.away_team?.name || m.away_team;

  // If teams not found in objects, try parsing title
  if ((!homeName || !awayName) && m.title) {
    // Try " vs " or " v " first (most common)
    let parts = m.title.split(/\s+vs\.?\s+|\s+v\.?\s+/i);
    
    // If not found, try " - " but be careful with tournament names like "MotoGP - Test"
    if (parts.length < 2) {
       // Only split on " - " if it looks like "Team A - Team B" (not perfect but better)
       // Or if category implies it (football usually uses vs)
       if (!m.category || m.category === 'football' || m.category === 'soccer') {
          parts = m.title.split(/\s+-\s+/);
       }
    }
    
    // For Cricket "Tournament: Team A vs Team B"
    if (parts.length < 2 && m.title.includes(':')) {
       const subTitle = m.title.split(':')[1].trim();
       parts = subTitle.split(/\s+vs\.?\s+|\s+v\.?\s+/i);
    }

    if (parts.length >= 2) {
      if (!homeName) homeName = parts[0].trim();
      if (!awayName) awayName = parts[1].trim();
    } else {
      // If still no split (e.g. "ATP Montpellier"), set Home to Title and Away to empty
      if (!homeName) homeName = m.title;
      if (!awayName) awayName = ''; // Empty string indicates single entity event
    }
  }

  // Fallbacks
  homeName = homeName || 'Home';
  awayName = awayName || ''; // Don't default to 'Away' if it might be a single event

  const homeLogo = m.teams?.home?.badge || m.teams?.home?.logo ||
    m.homeTeam?.logo || m.homeTeam?.badge ||
    m.home?.logo || m.home?.badge || '';
  const awayLogo = m.teams?.away?.badge || m.teams?.away?.logo ||
    m.awayTeam?.logo || m.awayTeam?.badge ||
    m.away?.logo || m.away?.badge || '';

  // Extract scores from multiple possible locations
  // WeStream API might use: score, scores, homeScore, awayScore, home_score, away_score, etc.
  let homeScore: number | null = null;
  let awayScore: number | null = null;

  if (m.homeScore !== undefined && m.homeScore !== null) {
    homeScore = typeof m.homeScore === 'number' ? m.homeScore : parseInt(String(m.homeScore), 10);
  } else if (m.home_score !== undefined && m.home_score !== null) {
    homeScore = typeof m.home_score === 'number' ? m.home_score : parseInt(String(m.home_score), 10);
  } else if (m.score?.home !== undefined && m.score?.home !== null) {
    homeScore = typeof m.score.home === 'number' ? m.score.home : parseInt(String(m.score.home), 10);
  } else if (m.scores?.home !== undefined && m.scores?.home !== null) {
    homeScore = typeof m.scores.home === 'number' ? m.scores.home : parseInt(String(m.scores.home), 10);
  } else if (m.result?.home !== undefined && m.result?.home !== null) {
    homeScore = typeof m.result.home === 'number' ? m.result.home : parseInt(String(m.result.home), 10);
  }

  if (m.awayScore !== undefined && m.awayScore !== null) {
    awayScore = typeof m.awayScore === 'number' ? m.awayScore : parseInt(String(m.awayScore), 10);
  } else if (m.away_score !== undefined && m.away_score !== null) {
    awayScore = typeof m.away_score === 'number' ? m.away_score : parseInt(String(m.away_score), 10);
  } else if (m.score?.away !== undefined && m.score?.away !== null) {
    awayScore = typeof m.score.away === 'number' ? m.score.away : parseInt(String(m.score.away), 10);
  } else if (m.scores?.away !== undefined && m.scores?.away !== null) {
    awayScore = typeof m.scores.away === 'number' ? m.scores.away : parseInt(String(m.scores.away), 10);
  } else if (m.result?.away !== undefined && m.result?.away !== null) {
    awayScore = typeof m.result.away === 'number' ? m.result.away : parseInt(String(m.result.away), 10);
  }

  // Extract status from multiple possible locations
  let status: 'live' | 'upcoming' | 'finished' = 'live';
  const statusValue = m.status || m.match_status || m.state || m.live_status || '';
  const statusLower = String(statusValue).toLowerCase();

  if (statusLower === 'in' || statusLower === 'live' || statusLower === 'playing' || statusLower === 'in-play') {
    status = 'live';
  } else if (statusLower === 'finished' || statusLower === 'ft' || statusLower === 'full-time' || statusLower === 'completed') {
    status = 'finished';
  } else if (statusLower === 'upcoming' || statusLower === 'scheduled' || statusLower === 'not-started' || statusLower === 'ns') {
    status = 'upcoming';
  } else if (m.date && new Date(m.date).getTime() > Date.now()) {
    // If match date is in future, it's upcoming
    status = 'upcoming';
  } else if (streamSources.length > 0) {
    // If has streams, assume it's live
    status = 'live';
  } else if (homeScore !== null || awayScore !== null) {
    // If has scores, assume it's live or finished
    status = 'live';
  }

  // Extract minute from multiple possible locations
  let minute: number | undefined = undefined;
  if (m.currentMinuteNumber !== undefined && m.currentMinuteNumber !== null) {
    minute = typeof m.currentMinuteNumber === 'number' ? m.currentMinuteNumber : parseInt(String(m.currentMinuteNumber), 10);
  } else if (m.currentMinute !== undefined && m.currentMinute !== null) {
    minute = parseMinuteFromTime(m.currentMinute);
  } else if (m.minute !== undefined && m.minute !== null) {
    minute = typeof m.minute === 'number' ? m.minute : parseMinuteFromTime(String(m.minute));
  } else if (m.time !== undefined && m.time !== null) {
    minute = parseMinuteFromTime(m.time);
  } else if (m.elapsed !== undefined && m.elapsed !== null) {
    minute = typeof m.elapsed === 'number' ? m.elapsed : parseInt(String(m.elapsed), 10);
  } else if (statusLower === 'ht' || statusLower === 'half-time') {
    minute = 45;
  }

  // Extract competition/league name
  const competition = m.league || m.leagueName || m.competition || m.tournament || m.category || m.sport || 'Football';

  // Extract venue/stadium
  const venue = m.venue || m.stadium || m.location || undefined;

  // Format start time
  let startTime: string | undefined = undefined;
  if (m.date) {
    const matchDate = new Date(m.date);
    if (!isNaN(matchDate.getTime())) {
      startTime = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } else if (m.startTime) {
    startTime = m.startTime;
  } else if (m.time) {
    startTime = m.time;
  }

  return {
    id: `westream-${m.id}`,
    homeTeam: {
      id: `westream-${m.id}-home`,
      name: homeName,
      shortName: teamNameToShortName(homeName),
      logo: homeLogo,
    },
    awayTeam: {
      id: `westream-${m.id}-away`,
      name: awayName,
      shortName: teamNameToShortName(awayName),
      logo: awayLogo,
    },
    homeScore,
    awayScore,
    status,
    minute,
    competition,
    venue,
    startTime,
    streamSources: streamSources.length > 0 ? streamSources : undefined,
  };
}

/**
 * Get live matches grouped by league
 */
export const getWeStreamLiveLeagueGroups = async (skipCache = false): Promise<LeagueGroup[]> => {
  const matches = await getWeStreamLiveMatches(skipCache);
  if (matches.length === 0) {
    console.log('[WeStream] No live matches, returning empty league groups');
    return [];
  }

  const matchRows: {
    match: Match;
    leagueKey: string;
    leagueName: string;
    country: string;
  }[] = [];

  // Process matches and fetch stream URLs
  // Show ALL matches, even without streams
  console.log(`[WeStream] Processing ${matches.length} matches for league grouping...`);
  for (const m of matches) {
    try {
      const streamSources = await extractWeStreamStreamSources(m);

      // Log if match has no streams (but still include it)
      if (streamSources.length === 0) {
        const homeName = m.teams?.home?.name || m.teams?.home || m.homeTeam?.name || m.homeTeam || 'Home';
        const awayName = m.teams?.away?.name || m.teams?.away || m.awayTeam?.name || m.awayTeam || 'Away';
        console.log(`[WeStream] Match ${homeName} vs ${awayName} has no streams (still including)`);
      }

      const appMatch = westreamToAppMatch(m, streamSources);
      console.log(`[WeStream] ✅ Mapped match: ${appMatch.homeTeam.name} vs ${appMatch.awayTeam.name}`, {
        scores: `${appMatch.homeScore ?? '?'}-${appMatch.awayScore ?? '?'}`,
        status: appMatch.status,
        minute: appMatch.minute,
        streams: streamSources.length,
      });
      const leagueName = m.league || m.leagueName || m.competition || m.tournament || m.category || m.sport || 'Football';
      const country = m.country || m.countryName || '';
      const leagueKey = `${country}-${leagueName}`.toLowerCase().replace(/\s+/g, '-');

      matchRows.push({
        match: appMatch,
        leagueKey,
        leagueName,
        country,
      });
    } catch (error: any) {
      console.error(`[WeStream] Error processing match:`, error, m);
      // Continue with next match
    }
  }

  console.log(`[WeStream] ✅ Processed ${matchRows.length} matches into match rows`);

  // Group by league
  const groupsMap = new Map<string, LeagueGroup>();
  for (const row of matchRows) {
    const existing = groupsMap.get(row.leagueKey);
    if (existing) {
      existing.matches.push(row.match);
    } else {
      groupsMap.set(row.leagueKey, {
        league: {
          id: row.leagueKey,
          name: row.leagueName,
          country: row.country,
        },
        matches: [row.match],
      });
    }
  }

  const groups = Array.from(groupsMap.values());
  console.log(`[WeStream] ✅ Grouped ${matchRows.length} matches into ${groups.length} leagues`);
  return groups;
};

/**
 * Fetch a single match by WeStream id
 */
export const getWeStreamMatchById = async (realId: string): Promise<Match | null> => {
  // WeStream doesn't have a direct match detail endpoint
  // We need to fetch all matches and find the one with matching ID
  const matches = await getWeStreamLiveMatches();
  const match = matches.find((m) => m.id === realId);

  if (!match) {
    console.warn(`[WeStream] Match not found: ${realId}`);
    return null;
  }

  const streamSources = extractWeStreamStreamSources(match);
  return westreamToAppMatch(match, streamSources);
};

/**
 * Get stream sources for a match by ID
 */
export const getWeStreamStreamSources = async (matchId: string): Promise<StreamSource[]> => {
  const matches = await getWeStreamLiveMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) {
    return [];
  }
  return await extractWeStreamStreamSources(match);
};

/**
 * Clear WeStream cache
 */
export const clearWeStreamCache = () => {
  requestCache.clear();
  console.log('[WeStream] Cache cleared');
};

/**
 * Get stream info (for future use if needed)
 */
export const getStreamInfo = async (source: string, id: string): Promise<any> => {
  const cacheKey = `westream:stream:${source}:${id}`;

  return getCachedOrFetch(cacheKey, async () => {
    const response = await fetch(`${WESTREAM_API_BASE}/stream/${source}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WeStream API error: ${response.status}`);
    }

    return await response.json();
  }, 60000); // 1 minute cache for stream info
};

/**
 * Normalize team name for better matching
 * Removes special characters, accents, and common suffixes
 */
const normalizeTeamName = (name: string): string => {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    // Handle U23, U21, U19 variations - keep them but normalize
    .replace(/\s*u\s*(\d+)\s*$/gi, ' u$1') // "U23" -> "u23", "U 23" -> "u23"
    // Remove common suffixes (more comprehensive list)
    .replace(/\s+(fc|cf|united|city|town|rovers|athletic|athletico|athletic club|fc barcelona|real madrid|cf|sporting|sports|club|ac|cf|sc|afc|cfc|rfc)$/gi, '')
    .replace(/\s+(fc|cf)$/gi, '')
    // Handle abbreviations like "U." -> keep it
    .replace(/\s+u\.\s*$/gi, '')
    // Remove special characters and accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    // Remove common prefixes
    .replace(/^(atletico|atletico madrid|real|cf|fc|sc|ac)\s+/gi, '')
    .trim();
};

/**
 * Calculate similarity between two strings (improved fuzzy matching)
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;
  if (longer === shorter) return 1.0;

  // Exact match after normalization
  if (longer.includes(shorter) || shorter.includes(longer)) {
    // If one is significantly shorter, reduce confidence
    if (longer.length > shorter.length * 1.5) {
      return 0.7;
    }
    return 0.9;
  }

  // Check word-by-word matching
  const words1 = str1.split(/\s+/).filter(w => w.length > 2); // Ignore short words
  const words2 = str2.split(/\s+/).filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  const commonWords = words1.filter(w => words2.includes(w));
  const totalWords = Math.max(words1.length, words2.length);

  if (commonWords.length > 0) {
    // If most words match, it's likely the same team
    const wordMatchRatio = commonWords.length / totalWords;
    if (wordMatchRatio >= 0.8) return 0.9;
    if (wordMatchRatio >= 0.6) return 0.75;
    if (wordMatchRatio >= 0.4) return 0.6;
    return 0.5;
  }

  // Check for substring matches in words
  let partialMatches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.includes(word2) || word2.includes(word1)) {
        partialMatches++;
        break;
      }
    }
  }

  if (partialMatches > 0) {
    return Math.min(0.7, (partialMatches / totalWords) * 0.8);
  }

  return 0;
};

export const findMatchingWeStreamMatch = (
  homeTeamName: string,
  awayTeamName: string,
  westreamMatches: WeStreamMatch[]
): WeStreamMatch | null => {
  if (!homeTeamName || !awayTeamName || westreamMatches.length === 0) {
    console.log(`[WeStream Match] Missing data - home: ${homeTeamName}, away: ${awayTeamName}, matches: ${westreamMatches.length}`);
    return null;
  }

  // Normalize team names for matching
  const normalizedHome = normalizeTeamName(homeTeamName);
  const normalizedAway = normalizeTeamName(awayTeamName);

  console.log(`[WeStream Match] 🔍 Looking for match: ${homeTeamName} vs ${awayTeamName}`);
  console.log(`[WeStream Match] 📊 Normalized: "${normalizedHome}" vs "${normalizedAway}"`);
  console.log(`[WeStream Match] 📋 Available WeStream matches: ${westreamMatches.length}`);

  // Log available WeStream match names for debugging
  if (westreamMatches.length > 0 && westreamMatches.length <= 20) {
    console.log('[WeStream Match] Available matches:', westreamMatches.map(m => ({
      home: m.teams?.home?.name || m.home_team?.name || m.homeTeam?.name || 'N/A',
      away: m.teams?.away?.name || m.away_team?.name || m.awayTeam?.name || 'N/A',
      title: m.title || 'N/A'
    })));
  }

  // Try to find the best match
  let bestMatch: WeStreamMatch | null = null;
  let bestScore = 0;

  for (const match of westreamMatches) {
    // Handle different team name structures
    const matchHomeName = match.teams?.home?.name || match.home_team?.name || match.homeTeam?.name || match.teams?.home || '';
    const matchAwayName = match.teams?.away?.name || match.away_team?.name || match.awayTeam?.name || match.teams?.away || '';

    if (!matchHomeName || !matchAwayName) {
      continue; // Skip matches without proper team names
    }

    const matchHome = normalizeTeamName(matchHomeName);
    const matchAway = normalizeTeamName(matchAwayName);

    // Also try matching using the match title (e.g., "Team A vs Team B")
    const matchTitle = normalizeTeamName(match.title || '');
    const titleParts = matchTitle.split(/ vs | v | - | vs\. | v\. /);
    const titleHome = titleParts[0]?.trim() || '';
    const titleAway = titleParts[1]?.trim() || '';

    // Check if title contains both team names (more flexible)
    const titleContainsHome = normalizedHome.includes(titleHome) || titleHome.includes(normalizedHome) || matchTitle.includes(normalizedHome);
    const titleContainsAway = normalizedAway.includes(titleAway) || titleAway.includes(normalizedAway) || matchTitle.includes(normalizedAway);
    const titleContainsBoth = titleContainsHome && titleContainsAway;

    // Also try swapped order
    const titleContainsHomeSwapped = normalizedAway.includes(titleHome) || titleHome.includes(normalizedAway) || matchTitle.includes(normalizedAway);
    const titleContainsAwaySwapped = normalizedHome.includes(titleAway) || titleAway.includes(normalizedHome) || matchTitle.includes(normalizedHome);
    const titleContainsBothSwapped = titleContainsHomeSwapped && titleContainsAwaySwapped;

    // Check both home/away and away/home combinations
    const homeHomeMatch = matchHome === normalizedHome;
    const awayAwayMatch = matchAway === normalizedAway;
    const homeAwayMatch = matchHome === normalizedAway;
    const awayHomeMatch = matchAway === normalizedHome;

    // Exact match (both teams match in correct order)
    if (homeHomeMatch && awayAwayMatch) {
      return match; // Perfect match, return immediately
    }

    // Exact match (teams swapped)
    if (homeAwayMatch && awayHomeMatch) {
      return match; // Perfect match, return immediately
    }

    // Title-based match (if title contains both team names)
    if (titleContainsBoth || titleContainsBothSwapped) {
      const titleScore = 0.85; // High confidence for title matches
      if (titleScore > bestScore) {
        bestScore = titleScore;
        bestMatch = match;
        console.log(`[WeStream Match] Found title match: "${match.title}" for "${homeTeamName} vs ${awayTeamName}"`);
      }
      continue;
    }

    // Calculate similarity scores (try both orderings)
    const homeSimilarity1 = homeHomeMatch ? 1.0 : calculateSimilarity(matchHome, normalizedHome);
    const awaySimilarity1 = awayAwayMatch ? 1.0 : calculateSimilarity(matchAway, normalizedAway);
    const score1 = (homeSimilarity1 + awaySimilarity1) / 2;

    const homeSimilarity2 = homeAwayMatch ? 1.0 : calculateSimilarity(matchHome, normalizedAway);
    const awaySimilarity2 = awayHomeMatch ? 1.0 : calculateSimilarity(matchAway, normalizedHome);
    const score2 = (homeSimilarity2 + awaySimilarity2) / 2;

    // Take the best score from either ordering
    const combinedScore = Math.max(score1, score2);

    // Lowered threshold even more to catch more matches (0.45)
    // Also check if at least one team matches very well (>= 0.75) even if the other is lower
    const hasStrongMatch = Math.max(homeSimilarity1, awaySimilarity1, homeSimilarity2, awaySimilarity2) >= 0.75;
    const hasModerateMatch = Math.max(homeSimilarity1, awaySimilarity1, homeSimilarity2, awaySimilarity2) >= 0.6;

    // More lenient matching:
    // 1. Combined score >= 0.45
    // 2. OR one team matches >= 0.75 and combined >= 0.35
    // 3. OR one team matches >= 0.6 and combined >= 0.4
    const meetsThreshold =
      combinedScore >= 0.45 ||
      (hasStrongMatch && combinedScore >= 0.35) ||
      (hasModerateMatch && combinedScore >= 0.4);

    if (meetsThreshold && combinedScore > bestScore) {
      bestScore = combinedScore;
      bestMatch = match;
      console.log(`[WeStream Match] ⚡ Potential match (score: ${combinedScore.toFixed(2)}): "${matchHomeName}" vs "${matchAwayName}" for "${homeTeamName}" vs "${awayTeamName}"`);
    }
  }

  if (bestMatch) {
    const bestMatchHome = normalizeTeamName(bestMatch.teams?.home?.name || bestMatch.home_team?.name || bestMatch.homeTeam?.name || '');
    const bestMatchAway = normalizeTeamName(bestMatch.teams?.away?.name || bestMatch.away_team?.name || bestMatch.awayTeam?.name || '');
    console.log(`[WeStream Match] ✅ Found match with score ${bestScore.toFixed(2)}: ${bestMatchHome} vs ${bestMatchAway}`);
  } else {
    console.log(`[WeStream Match] ❌ No match found for ${homeTeamName} vs ${awayTeamName}`);
    // Log first few available matches for debugging
    if (westreamMatches.length > 0) {
      console.log('[WeStream Match] Available matches:', westreamMatches.slice(0, 5).map(m => ({
        home: m.teams?.home?.name || m.home_team?.name || m.homeTeam?.name || 'N/A',
        away: m.teams?.away?.name || m.away_team?.name || m.awayTeam?.name || 'N/A',
        title: m.title || 'N/A',
        sources: m.sources?.length || 0
      })));
    }
  }

  return bestMatch;
};

/**
 * Add streaming sources to a match
 */
export const enrichMatchWithStreams = async (match: Match): Promise<Match & { streamSources?: WeStreamSource[] }> => {
  try {
    const westreamMatches = await getWeStreamLiveMatches();
    const matchingStream = findMatchingWeStreamMatch(
      match.homeTeam.name,
      match.awayTeam.name,
      westreamMatches
    );

    if (matchingStream && matchingStream.sources.length > 0) {
      return {
        ...match,
        streamSources: matchingStream.sources,
      };
    }
  } catch (error) {
    console.error('Error enriching match with streams:', error);
  }

  return match;
};

/**
 * Debug function to test WeStream API
 * Call this from browser console: window.testWeStream()
 */
export const testWeStreamAPI = async () => {
  console.log('🧪 Testing WeStream API...');
  try {
    const matches = await getWeStreamLiveMatches();
    console.log(`✅ Found ${matches.length} matches with streams`);

    if (matches.length > 0) {
      console.log('📋 Sample matches:');
      matches.slice(0, 5).forEach((match, idx) => {
        console.log(`${idx + 1}. ${match.teams?.home?.name || 'N/A'} vs ${match.teams?.away?.name || 'N/A'}`);
        console.log(`   Title: ${match.title || 'N/A'}`);
        console.log(`   Sources: ${match.sources?.length || 0}`);
        console.log(`   Category: ${match.category || 'N/A'}`);
      });
    } else {
      console.warn('⚠️ No matches found. Check if the API endpoint is correct.');
    }

    return matches;
  } catch (error) {
    console.error('❌ Error testing WeStream API:', error);
    return [];
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testWeStream = testWeStreamAPI;
}
