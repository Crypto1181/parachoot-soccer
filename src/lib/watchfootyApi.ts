import { StreamSource } from './streamAggregator';
import type { Match } from '@/data/mockData';
import type { LeagueGroup } from '@/types/league';

// WatchFooty API Configuration
// Free API, no API key required
// Use proxy in dev to avoid CORS (Vite proxies /api/watchfooty → api.watchfooty.st)
// Fallback to CORS proxy if direct requests fail
const WATCHFOOTY_API_BASE = import.meta.env.DEV ? '/api/watchfooty' : 'https://api.watchfooty.st';
// CORS proxy services (fallback if direct/proxy fails)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=', // Free, no approval needed
  'https://corsproxy.io/?', // Free CORS proxy
];

// WatchFooty API Types
interface WatchFootyTeam {
  name: string;
  badge?: string;
}

interface WatchFootySource {
  source: string;
  id: string;
}

interface WatchFootyMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  popular?: boolean;
  teams: {
    home: WatchFootyTeam;
    away: WatchFootyTeam;
  };
  sources: WatchFootySource[];
  league?: string;
  country?: string;
}

interface WatchFootyMatchDetail {
  id: string;
  title: string;
  teams: {
    home: WatchFootyTeam;
    away: WatchFootyTeam;
  };
  sources: WatchFootySource[];
  league?: string;
  country?: string;
  date?: number;
  category?: string;
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

/** Clear WatchFooty cache */
export const clearWatchFootyCache = () => {
  for (const key of Array.from(requestCache.keys())) {
    if (key.startsWith('watchfooty:')) requestCache.delete(key);
  }
};

/**
 * Fetch live matches from WatchFooty API
 * Endpoint: /api/v1/matches/live or /api/v1/matches/football
 */
export const getWatchFootyLiveMatches = async (skipCache = false): Promise<WatchFootyMatch[]> => {
  const cacheKey = 'watchfooty:live';

  return getCachedOrFetch(
    cacheKey,
    async () => {
      try {
        // Try multiple endpoints - WatchFooty API endpoints
        // First try direct/proxy, then try with CORS proxy fallback
        const baseUrls = [
          WATCHFOOTY_API_BASE,
          'https://api.watchfooty.st',
          'https://watchfooty.st',
        ];
        
        // Based on WatchFooty API docs: https://www.watchfooty.st/en/docs
        // Endpoints listed: /api/v1/matches, /api/v1/sports, /api/v1/match-details
        // Try different endpoint patterns - the API might not have a direct "live" endpoint
        // We may need to fetch all matches and filter, or use a different structure
        const endpoints = [
          '/api/v1/matches',  // Base matches endpoint
          '/api/v1/sports/football',  // Try sports endpoint
          '/api/v1/sports/football/matches',  // Sports with matches
          '/api/v1/matches?type=live',  // Query parameter variant
          '/api/v1/matches?filter=live',  // Another variant
        ];
        
        const allEndpoints: string[] = [];
        
        // Add direct endpoints
        for (const base of baseUrls) {
          for (const endpoint of endpoints) {
            allEndpoints.push(`${base}${endpoint}`);
          }
        }
        
        // Add CORS proxy endpoints as fallback
        for (const proxy of CORS_PROXIES) {
          for (const endpoint of endpoints) {
            const targetUrl = `https://api.watchfooty.st${endpoint}`;
            if (proxy.includes('allorigins')) {
              allEndpoints.push(`${proxy}${encodeURIComponent(targetUrl)}`);
            } else {
              allEndpoints.push(`${proxy}${targetUrl}`);
            }
          }
        }

        for (const url of allEndpoints) {
          try {
            console.log(`[WatchFooty] Trying endpoint: ${url}`);
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              mode: 'cors',
              credentials: 'omit',
            });

            if (!response.ok) {
              console.warn(`[WatchFooty] HTTP ${response.status} for ${url}`);
              // Log response text for debugging
              try {
                const errorText = await response.text();
                console.warn(`[WatchFooty] Error response: ${errorText.substring(0, 200)}`);
              } catch (e) {
                // Ignore
              }
              continue;
            }

            const data = await response.json();
            console.log(`[WatchFooty] ✅ Success! Response from ${url}:`, data);

            // Parse response - handle different structures
            let matches: WatchFootyMatch[] = [];
            if (Array.isArray(data)) {
              matches = data;
            } else if (data.matches && Array.isArray(data.matches)) {
              matches = data.matches;
            } else if (data.data && Array.isArray(data.data)) {
              matches = data.data;
            } else if (data.results && Array.isArray(data.results)) {
              matches = data.results;
            } else if (data.items && Array.isArray(data.items)) {
              matches = data.items;
            }

            // If we got matches, log the structure for debugging
            if (matches.length > 0) {
              console.log(`[WatchFooty] 📊 Found ${matches.length} total matches from ${url}`);
              console.log(`[WatchFooty] Sample match structure:`, JSON.stringify(matches[0], null, 2).substring(0, 500));
            } else {
              console.log(`[WatchFooty] Response structure from ${url}:`, Object.keys(data || {}));
              console.log(`[WatchFooty] Full response (first 500 chars):`, JSON.stringify(data, null, 2).substring(0, 500));
            }

            // Filter for football/soccer matches
            // According to API docs, matches have: teams, sport, status fields
            const footballMatches = matches.filter((m: any) => {
              const isFootball =
                m.sport === 'football' ||
                m.category === 'football' ||
                m.category === 'soccer' ||
                m.sport === 'soccer';
              
              const hasTeams =
                (m.teams?.home?.name || m.teams?.home) && 
                (m.teams?.away?.name || m.teams?.away);
              
              // Check if it's live (status: 'in' or 'live' or currentMinute exists)
              const isLive = 
                m.status === 'in' || 
                m.status === 'live' || 
                m.currentMinute !== undefined ||
                m.currentMinuteNumber !== undefined;

              return isFootball && hasTeams && isLive;
            });

            if (footballMatches.length > 0) {
              const withSources = footballMatches.filter((m: any) => 
                (m.sources && Array.isArray(m.sources) && m.sources.length > 0) ||
                (m.streams && Array.isArray(m.streams) && m.streams.length > 0)
              );
              console.log(
                `[WatchFooty] ✅ Found ${footballMatches.length} live football matches (${withSources.length} with streams)`
              );
              return footballMatches;
            } else if (matches.length > 0) {
              // We got matches but they don't match our filter - log for debugging
              console.warn(`[WatchFooty] Got ${matches.length} matches but ${footballMatches.length} passed filter`);
              if (matches.length > 0) {
                console.warn(`[WatchFooty] First match sample:`, JSON.stringify(matches[0], null, 2).substring(0, 300));
              }
            }
          } catch (error) {
            console.error(`[WatchFooty] Error fetching from ${url}:`, error);
            continue;
          }
        }

        console.warn('[WatchFooty] No live matches found');
        return [];
      } catch (error) {
        console.error('[WatchFooty] Error fetching live matches:', error);
        return [];
      }
    },
    30000,
    skipCache
  );
};

/**
 * Get match detail from WatchFooty API
 */
export const getWatchFootyMatchDetail = async (
  matchId: string
): Promise<WatchFootyMatchDetail | null> => {
  const cacheKey = `watchfooty:detail:${matchId}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
      try {
        // Based on WatchFooty API docs: /api/v1/match/[id]
        // https://www.watchfooty.st/en/docs/api/match-details
        const endpoints = [
          `${WATCHFOOTY_API_BASE}/api/v1/match/${matchId}`,
          `${WATCHFOOTY_API_BASE}/api/v1/match-details/${matchId}`,
          `${WATCHFOOTY_API_BASE}/api/v1/matches/${matchId}`,
        ];
        
        // Add CORS proxy fallbacks
        for (const proxy of CORS_PROXIES) {
          const targetUrl = `https://api.watchfooty.st/api/v1/match/${matchId}`;
          if (proxy.includes('allorigins')) {
            endpoints.push(`${proxy}${encodeURIComponent(targetUrl)}`);
          } else {
            endpoints.push(`${proxy}${targetUrl}`);
          }
        }

        for (const url of endpoints) {
          try {
            console.log(`[WatchFooty] Fetching match detail: ${url}`);
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
            });

            if (!response.ok) {
              continue;
            }

            const data = await response.json();
            console.log(`[WatchFooty] Match detail response:`, data);

            // Handle different response structures
            let matchDetail = data;
            if (data.data) {
              matchDetail = data.data;
            } else if (data.match) {
              matchDetail = data.match;
            }

            if (matchDetail && matchDetail.id) {
              return matchDetail;
            }
          } catch (error) {
            console.error(`[WatchFooty] Error fetching detail from ${url}:`, error);
            continue;
          }
        }

        return null;
      } catch (error) {
        console.error(`[WatchFooty] Error fetching match detail:`, error);
        return null;
      }
    },
    60000
  );
};

/**
 * Extract streaming sources from WatchFooty match
 */
export const extractWatchFootyStreamSources = (
  match: WatchFootyMatch | WatchFootyMatchDetail
): StreamSource[] => {
  const sources: StreamSource[] = [];
  const id = match.id;

  if (!match.sources || !Array.isArray(match.sources) || match.sources.length === 0) {
    console.warn(`[WatchFooty] No sources found for match ${id}`);
    return sources;
  }

  match.sources.forEach((source, index) => {
    if (source.source && source.id) {
      // WatchFooty embed URL format: https://watchfooty.st/embed/{source}/{id}
      const embedUrl = `https://watchfooty.st/embed/${source.source}/${source.id}`;
      sources.push({
        source: source.source,
        id: source.id,
        provider: 'watchfooty',
        embedUrl,
      });
      console.log(`[WatchFooty] ✅ Extracted stream source ${index + 1}: ${source.source}`);
    }
  });

  return sources;
};

/**
 * Normalize team name for matching
 */
const normalizeTeamName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+(fc|cf|united|city|town|rovers|athletic|club|cf|sc|afc|cfc|rfc)$/gi, '')
    .replace(/^(atletico|real|cf|fc|sc|ac)\s+/gi, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Calculate similarity between two strings
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  if (str1.includes(str2) || str2.includes(str1)) return 0.8;

  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  let matches = 0;
  const total = Math.max(words1.length, words2.length);

  for (const word1 of words1) {
    if (words2.some((word2) => word1 === word2 || word1.includes(word2) || word2.includes(word1))) {
      matches++;
    }
  }

  return matches / total;
};

/**
 * Find matching WatchFooty match by team names
 */
export const findMatchingWatchFootyMatch = (
  homeTeamName: string,
  awayTeamName: string,
  watchfootyMatches: WatchFootyMatch[]
): WatchFootyMatch | null => {
  if (!homeTeamName || !awayTeamName || watchfootyMatches.length === 0) {
    return null;
  }

  const normalizedHome = normalizeTeamName(homeTeamName);
  const normalizedAway = normalizeTeamName(awayTeamName);

  let bestMatch: WatchFootyMatch | null = null;
  let bestScore = 0;

  for (const match of watchfootyMatches) {
    const matchHome = normalizeTeamName(match.teams?.home?.name || '');
    const matchAway = normalizeTeamName(match.teams?.away?.name || '');

    const homeScore = calculateSimilarity(matchHome, normalizedHome);
    const awayScore = calculateSimilarity(matchAway, normalizedAway);
    const swappedHomeScore = calculateSimilarity(matchHome, normalizedAway);
    const swappedAwayScore = calculateSimilarity(matchAway, normalizedHome);

    // Perfect match (normal order)
    if (homeScore >= 0.8 && awayScore >= 0.8) {
      const score = (homeScore + awayScore) / 2;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = match;
      }
    }
    // Perfect match (swapped order)
    else if (swappedHomeScore >= 0.8 && swappedAwayScore >= 0.8) {
      const score = (swappedHomeScore + swappedAwayScore) / 2;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = match;
      }
    }
    // Partial match
    else if (
      (homeScore >= 0.5 || swappedHomeScore >= 0.5) &&
      (awayScore >= 0.5 || swappedAwayScore >= 0.5)
    ) {
      const score = Math.max(
        (homeScore + awayScore) / 2,
        (swappedHomeScore + swappedAwayScore) / 2
      );
      if (score > bestScore) {
        bestScore = score;
        bestMatch = match;
      }
    }
  }

  if (bestMatch && bestScore >= 0.5) {
    console.log(
      `[WatchFooty] ✅ Match found with similarity score: ${(bestScore * 100).toFixed(0)}%`
    );
    return bestMatch;
  }

  return null;
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
  const halfMatch = t.match(/(?:1st|2nd|first|second)\s+half\s+(\d+)/i);
  if (halfMatch) return parseInt(halfMatch[1], 10);
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
 * Map WatchFooty match to app Match format
 */
function watchFootyToAppMatch(
  m: WatchFootyMatch | any,
  streamSources: StreamSource[]
): Match {
  // Handle API response structure from docs
  const homeName = m.teams?.home?.name || m.homeTeam?.name || 'Home';
  const awayName = m.teams?.away?.name || m.awayTeam?.name || 'Away';
  const homeLogo = m.teams?.home?.logoUrl || m.teams?.home?.badge || m.homeTeam?.logoUrl || '';
  const awayLogo = m.teams?.away?.logoUrl || m.teams?.away?.badge || m.awayTeam?.logoUrl || '';
  
  // Extract scores from API response
  const homeScore = m.homeScore !== undefined ? m.homeScore : null;
  const awayScore = m.awayScore !== undefined ? m.awayScore : null;
  
  // Extract status and minute
  const status = m.status === 'in' || m.status === 'live' ? 'live' : 
                 m.status === 'finished' || m.status === 'ft' ? 'finished' : 'upcoming';
  const minute = m.currentMinuteNumber !== undefined ? m.currentMinuteNumber : 
                 m.currentMinute ? parseMinuteFromTime(String(m.currentMinute)) : undefined;

  return {
    id: `watchfooty-${m.id || m.matchId || Date.now()}`,
    homeTeam: {
      id: `watchfooty-${m.id || m.matchId || Date.now()}-home`,
      name: homeName,
      shortName: teamNameToShortName(homeName),
      logo: homeLogo,
    },
    awayTeam: {
      id: `watchfooty-${m.id || m.matchId || Date.now()}-away`,
      name: awayName,
      shortName: teamNameToShortName(awayName),
      logo: awayLogo,
    },
    homeScore,
    awayScore,
    status,
    minute,
    competition: m.league || m.eventName || 'Football',
    venue: m.venue,
    startTime: m.date ? new Date(m.date).toLocaleTimeString() : undefined,
    streamSources: streamSources.length > 0 ? streamSources : undefined,
  };
}

/**
 * Fetch live matches from WatchFooty and return LeagueGroup[]
 * Use this for Live TV page
 */
export const getWatchFootyLiveLeagueGroups = async (
  skipCache = false
): Promise<LeagueGroup[]> => {
  const matches = await getWatchFootyLiveMatches(skipCache);
  if (matches.length === 0) {
    console.log('[WatchFooty] ⚠️ No live matches found from API. The /api/v1/matches endpoint may not exist or may require different parameters.');
    console.log('[WatchFooty] 💡 Suggestion: WatchFooty API might only provide match details by ID, not a list endpoint.');
    return [];
  }

  const matchRows: {
    match: Match;
    leagueKey: string;
    leagueName: string;
    country: string;
  }[] = [];

  for (const m of matches) {
    // Try to get streams from match detail if not in list response
    let streamSources = extractWatchFootyStreamSources(m);
    
    // If no streams in list response, try fetching match detail
    if (streamSources.length === 0 && m.id) {
      console.log(`[WatchFooty] No streams in list, fetching detail for match ${m.id}...`);
      try {
        const detail = await getWatchFootyMatchDetail(m.id);
        if (detail) {
          streamSources = extractWatchFootyStreamSources(detail);
        }
      } catch (err) {
        console.warn(`[WatchFooty] Failed to fetch detail for ${m.id}:`, err);
      }
    }
    
    // Include matches even without streams for now (user can see matches exist)
    // But log which ones have streams
    if (streamSources.length === 0) {
      console.log(
        `[WatchFooty] ⚠️ Match ${m.teams?.home?.name} vs ${m.teams?.away?.name} – no streams found`
      );
      // Still include it but mark as no streams
    }

    const appMatch = watchFootyToAppMatch(m, streamSources);
    const leagueName = m.league || m.eventName || 'Football';
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
    `[WatchFooty] Live TV: ${matchRows.length}/${matches.length} matches have streams, ${groups.length} leagues`
  );
  return groups;
};

/**
 * Fetch a single match by WatchFooty id
 */
export const getWatchFootyMatchById = async (realId: string): Promise<Match | null> => {
  const detail = await getWatchFootyMatchDetail(realId);
  if (!detail) {
    console.warn(`[WatchFooty] No match detail found for ID: ${realId}`);
    return null;
  }

  console.log(`[WatchFooty] Processing match detail for ID: ${realId}`);
  
  // Extract streams from match detail
  const streamSources = extractWatchFootyStreamSources(detail);
  
  // Convert detail to match format
  const m: any = {
    id: detail.id || detail.matchId || realId,
    title: detail.title || detail.eventName || '',
    category: detail.sport || detail.category || 'football',
    date: detail.date || detail.timestamp ? (typeof detail.timestamp === 'number' ? detail.timestamp * 1000 : new Date(detail.date).getTime()) : Date.now(),
    teams: detail.teams || {
      home: { name: detail.homeTeam?.name, badge: detail.homeTeam?.logoUrl },
      away: { name: detail.awayTeam?.name, badge: detail.awayTeam?.logoUrl },
    },
    sources: detail.sources || detail.streams || [],
    league: detail.league || detail.eventName,
    country: detail.country,
    homeScore: detail.homeScore,
    awayScore: detail.awayScore,
    status: detail.status,
    currentMinute: detail.currentMinute,
    currentMinuteNumber: detail.currentMinuteNumber,
    venue: detail.venue,
  };

  return watchFootyToAppMatch(m, streamSources);
};

/**
 * Get streaming sources for a match from WatchFooty
 */
export const getWatchFootyStreamSources = async (
  homeTeamName: string,
  awayTeamName: string
): Promise<StreamSource[]> => {
  try {
    console.log(`[WatchFooty] 🔍 Searching for: ${homeTeamName} vs ${awayTeamName}`);

    const liveMatches = await getWatchFootyLiveMatches();

    if (liveMatches.length === 0) {
      console.log('[WatchFooty] No live matches found');
      return [];
    }

    const matchingMatch = findMatchingWatchFootyMatch(homeTeamName, awayTeamName, liveMatches);

    if (!matchingMatch) {
      console.log(`[WatchFooty] ❌ No match found for: ${homeTeamName} vs ${awayTeamName}`);
      return [];
    }

    console.log(
      `[WatchFooty] ✅ Found match: ${matchingMatch.teams?.home?.name} vs ${matchingMatch.teams?.away?.name}`
    );

    return extractWatchFootyStreamSources(matchingMatch);
  } catch (error) {
    console.error('[WatchFooty] Error getting stream sources:', error);
    return [];
  }
};
