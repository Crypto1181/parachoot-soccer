import { StreamSource } from './streamAggregator';
import type { Match } from '@/data/mockData';
import type { LeagueGroup } from '@/types/league';

// SportSRC API Configuration
// Use proxy in dev to avoid CORS (Vite proxies /api/sportsrc → api.sportsrc.org)
// Note: Proxy rewrites /api/sportsrc to empty, so /api/sportsrc/v2 becomes /v2
const SPORTSRC_API_BASE = import.meta.env.DEV ? '/api/sportsrc/v2' : 'https://api.sportsrc.org/v2';
const SPORTSRC_API_KEY = import.meta.env.VITE_SPORTSRC_API_KEY || 'c54205b3a2199f2290a653ea40da84ce';

/**
 * Translate league names to English
 * Defined at module level to ensure it's accessible everywhere
 */
function translateLeagueName(leagueName: string): string {
  if (!leagueName) return 'Football';
  
  const translations: Record<string, string> = {
    'Liga Profesional de Fútbol': 'Argentine Professional League',
    'Primera División': 'First Division',
    'Primera A': 'First Division A',
    'Brasileirão': 'Brazilian Championship',
    'Brasileirão Betano': 'Brazilian Championship',
    'Serie A': 'Serie A',
    'Serie B': 'Serie B',
    'Premier League': 'Premier League',
    'La Liga': 'La Liga',
    'Bundesliga': 'Bundesliga',
    'Serie A (Italy)': 'Serie A',
    'Ligue 1': 'Ligue 1',
    'Eredivisie': 'Eredivisie',
    'Primeira Liga': 'Primeira Liga',
    'Super Lig': 'Turkish Super Lig',
    'Apertura': 'Opening',
    'Clausura': 'Closing',
  };
  
  // Check for exact match
  if (translations[leagueName]) {
    return translations[leagueName];
  }
  
  // Check for partial matches (e.g., "Primera División, Apertura")
  for (const [key, value] of Object.entries(translations)) {
    if (leagueName.includes(key)) {
      // Replace the key with translation, keep the rest
      return leagueName.replace(key, value);
    }
  }
  
  return leagueName;
}

/**
 * Get match by ID (Mock implementation since we removed the real one)
 * Returns null as we're not using SportSRC anymore
 */
export const getSportSRCMatchById = async (id: string): Promise<Match | null> => {
  console.warn('[SportSRC] API usage is deprecated. Returning null.');
  return null;
};


// SportSRC API Types
interface SportSRCMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  status: string;
  time?: string;
  league?: string;
  country?: string;
}

interface SportSRCMatchDetail {
  id: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  status: string;
  streaming?: {
    embed?: string;
    url?: string;
    links?: Array<{
      url: string;
      quality?: string;
      language?: string;
    }>;
  };
  venue?: string;
  referee?: string;
}

// Request cache
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache

const getCachedOrFetch = async (cacheKey: string, fetchFn: () => Promise<any>, cacheTime: number = CACHE_DURATION, skipCache = false): Promise<any> => {
  const cached = requestCache.get(cacheKey);
  const now = Date.now();

  if (!skipCache && cached && (now - cached.timestamp) < cacheTime) {
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

/** Clear SportSRC live-matches cache (e.g. before Retry). */
export const clearSportSRCLiveCache = () => {
  for (const key of Array.from(requestCache.keys())) {
    if (key.startsWith('sportsrc:live')) requestCache.delete(key);
  }
};

/** Today in YYYY-MM-DD (local). Per docs: GET MATCHES requires date. */
const todayYYYYMMDD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Fetch live matches from SportSRC API.
 * Docs: https://my.sportsrc.org/docs/
 * GET MATCHES: type=matches&sport=football&status=inprogress&date=YYYY-MM-DD
 */
export const getSportSRCLiveMatches = async (skipCache = false): Promise<SportSRCMatch[]> => {
  const cacheKey = 'sportsrc:live';

  const normalize = (m: any): any => {
    if (!m) return m;
    
    // Handle nested teams structure: teams.home.name and teams.away.name
    let homeTeam = m.home_team ?? m.homeTeam ?? m.home;
    let awayTeam = m.away_team ?? m.awayTeam ?? m.away;
    
    if (!homeTeam && m.teams?.home) {
      homeTeam = m.teams.home.name ?? m.teams.home.title ?? m.teams.home;
    }
    if (!awayTeam && m.teams?.away) {
      awayTeam = m.teams.away.name ?? m.teams.away.title ?? m.teams.away;
    }
    
    // Extract league info if available - handle both string and object
    const league = m.league ?? m.league_name ?? m.competition;
    const country = m.country ?? m.country_name;
    
    let leagueName = 'Football';
    if (typeof league === 'string') {
      leagueName = league;
    } else if (league && typeof league === 'object') {
      leagueName = league.name ?? league.title ?? leagueName;
    }
    
    let countryName = '';
    if (typeof country === 'string') {
      countryName = country;
    } else if (country && typeof country === 'object') {
      countryName = country.name ?? country.title ?? '';
    }
    
    return {
      ...m,
      id: m.id ?? m.match_id ?? m.fixture_id,
      home_team: homeTeam,
      away_team: awayTeam,
      league: leagueName,
      country: countryName,
      home_score: m.home_score ?? m.homeScore ?? m.score?.home ?? m.score?.current?.home ?? m.scores?.home ?? m.scores?.current?.home,
      away_score: m.away_score ?? m.awayScore ?? m.score?.away ?? m.score?.current?.away ?? m.scores?.away ?? m.scores?.current?.away,
      status: m.status ?? m.match_status,
      time: m.time ?? m.minute ?? m.status_detail,
    };
  };

  const parse = (data: any): SportSRCMatch[] => {
    let list: any[] = [];
    
    // Handle SportSRC API response structure: data.data is array of league objects, each with matches array
    if (data?.data && Array.isArray(data.data)) {
      // Flatten: extract all matches from all leagues
      const allMatches: any[] = [];
      for (const leagueObj of data.data) {
        if (leagueObj?.matches && Array.isArray(leagueObj.matches)) {
          // Extract league name - handle both string and object
          let leagueName = 'Football';
          const leagueData = leagueObj.league?.name ?? leagueObj.league_name ?? leagueObj.league;
          if (typeof leagueData === 'string') {
            leagueName = leagueData;
          } else if (leagueData && typeof leagueData === 'object') {
            leagueName = leagueData.name ?? leagueData.title ?? leagueName;
          }
          
          // Translate league name to English
          leagueName = translateLeagueName(leagueName);
          
          // Extract country name - handle both string and object
          let countryName = '';
          const countryData = leagueObj.country?.name ?? leagueObj.country_name ?? leagueObj.country;
          if (typeof countryData === 'string') {
            countryName = countryData;
          } else if (countryData && typeof countryData === 'object') {
            countryName = countryData.name ?? countryData.title ?? '';
          }
          
          // Add league info to each match
          const leagueMatches = leagueObj.matches.map((m: any) => ({
            ...m,
            league: leagueName,
            country: countryName,
          }));
          allMatches.push(...leagueMatches);
        }
      }
      list = allMatches;
      console.log(`[SportSRC] Extracted ${list.length} matches from ${data.data.length} leagues`);
    }
    // Fallback to other structures
    else if (Array.isArray(data)) {
      list = data;
    }
    else if (data?.matches && Array.isArray(data.matches)) {
      list = data.matches;
    }
    else if (data?.results && Array.isArray(data.results)) {
      list = data.results;
    }
    else if (data?.items && Array.isArray(data.items)) {
      list = data.items;
    }
    else if (data?.events && Array.isArray(data.events)) {
      list = data.events;
    }
    else if (data?.fixtures && Array.isArray(data.fixtures)) {
      list = data.fixtures;
    }
    else if (data?.games && Array.isArray(data.games)) {
      list = data.games;
    }
    
    const normalized = list.map(normalize);
    const filtered = normalized.filter((m: any) => {
      const hasId = !!m?.id;
      const hasHomeTeam = !!m?.home_team;
      const hasAwayTeam = !!m?.away_team;
      return hasId && hasHomeTeam && hasAwayTeam;
    });
    
    if (list.length > 0 && filtered.length < list.length) {
      console.log(`[SportSRC] Dropped ${list.length - filtered.length} matches (missing id/home_team/away_team)`);
      console.log(`[SportSRC] Sample dropped match:`, list.find((m: any) => {
        const normalized = normalize(m);
        return !normalized.id || !normalized.home_team || !normalized.away_team;
      }));
    }
    
    return filtered;
  };

  const date = todayYYYYMMDD();
  const cacheKeyWithDate = `${cacheKey}:${date}`;

  const fetchMatches = async (): Promise<SportSRCMatch[]> => {
    const url = `${SPORTSRC_API_BASE}/?type=matches&sport=football&status=inprogress&date=${date}&api_key=${encodeURIComponent(SPORTSRC_API_KEY)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-API-KEY': SPORTSRC_API_KEY, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.warn(`[SportSRC] GET MATCHES HTTP ${res.status} - ${errorText}`);
      
      // Check for authentication errors
      if (res.status === 401 || res.status === 403) {
        console.error(`[SportSRC] Authentication failed! Check your API key. Status: ${res.status}`);
        console.error(`[SportSRC] Using API Key: ${SPORTSRC_API_KEY.substring(0, 8)}...${SPORTSRC_API_KEY.substring(SPORTSRC_API_KEY.length - 4)}`);
      }
      
      return [];
    }
    const data = await res.json();
    
    // Check for API error messages
    if (data.error || data.message) {
      console.warn(`[SportSRC] API returned error:`, data.error || data.message);
    }
    
    // Log success status
    if (data.success !== undefined) {
      console.log(`[SportSRC] API request successful: ${data.success}`);
    }
    console.log('[SportSRC] Raw API response structure:', {
      hasData: !!data.data,
      dataIsArray: Array.isArray(data.data),
      dataLength: Array.isArray(data.data) ? data.data.length : 0,
      totalMatches: data.total_matches,
      totalLeagues: data.total_leagues,
      topLevelKeys: Object.keys(data),
    });
    
    if (Array.isArray(data.data) && data.data.length > 0) {
      const firstLeague = data.data[0];
      console.log('[SportSRC] First league structure:', {
        hasMatches: !!firstLeague.matches,
        matchesIsArray: Array.isArray(firstLeague.matches),
        matchesLength: Array.isArray(firstLeague.matches) ? firstLeague.matches.length : 0,
        leagueKeys: Object.keys(firstLeague),
      });
      
      if (firstLeague.matches && firstLeague.matches.length > 0) {
        const firstMatch = firstLeague.matches[0];
        console.log('[SportSRC] First match structure:', {
          id: firstMatch.id,
          title: firstMatch.title,
          hasTeams: !!firstMatch.teams,
          teamsKeys: firstMatch.teams ? Object.keys(firstMatch.teams) : [],
          homeTeam: firstMatch.teams?.home?.name,
          awayTeam: firstMatch.teams?.away?.name,
          matchKeys: Object.keys(firstMatch),
        });
      }
    }
    
    const list = parse(data);
    if (list.length === 0) {
      console.log('[SportSRC] Raw GET MATCHES keys:', Object.keys(data));
      console.log('[SportSRC] Raw sample:', JSON.stringify(data).slice(0, 1000));
    }
    return list;
  };

  return getCachedOrFetch(cacheKeyWithDate, async () => {
    try {
      const matches = await fetchMatches();
      console.log(`[SportSRC] ✅ ${matches.length} valid live matches (date=${date})`);
      if (matches.length > 0) console.log(`[SportSRC] Sample: ${matches[0].home_team} vs ${matches[0].away_team}`);
      return matches;
    } catch (error) {
      console.error('[SportSRC] Error fetching live matches:', error);
      return [];
    }
  }, 30000, skipCache);
};

/**
 * Get match detail including streaming URLs from SportSRC
 */
export const getSportSRCMatchDetail = async (matchId: string): Promise<SportSRCMatchDetail | null> => {
  const cacheKey = `sportsrc:detail:${matchId}`;
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      // Build URL - ensure proper format
      const url = `${SPORTSRC_API_BASE}/?type=detail&id=${encodeURIComponent(matchId)}&api_key=${encodeURIComponent(SPORTSRC_API_KEY)}`;
      console.log(`[SportSRC] Fetching match detail: ${url.replace(SPORTSRC_API_KEY, '***')}`);
      console.log(`[SportSRC] API Base: ${SPORTSRC_API_BASE}`);
      console.log(`[SportSRC] Match ID: ${matchId}`);
      
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-API-KEY': SPORTSRC_API_KEY,
            'Content-Type': 'application/json',
          },
        });
      } catch (fetchError) {
        console.error(`[SportSRC] Fetch error for ${matchId}:`, fetchError);
        // Try direct API call if proxy fails
        if (import.meta.env.DEV) {
          console.log(`[SportSRC] Retrying with direct API call...`);
          try {
            const directUrl = `https://api.sportsrc.org/v2/?type=detail&id=${encodeURIComponent(matchId)}&api_key=${encodeURIComponent(SPORTSRC_API_KEY)}`;
            response = await fetch(directUrl, {
              method: 'GET',
              headers: {
                'X-API-KEY': SPORTSRC_API_KEY,
                'Content-Type': 'application/json',
              },
            });
          } catch (directError) {
            console.error(`[SportSRC] Direct API call also failed:`, directError);
            return null;
          }
        } else {
          return null;
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`[SportSRC] Error fetching match detail for ${matchId}: ${response.status} - ${errorText}`);
        console.warn(`[SportSRC] Response headers:`, Object.fromEntries(response.headers.entries()));
        
        // Check for authentication errors
        if (response.status === 401 || response.status === 403) {
          console.error(`[SportSRC] Authentication failed! Check your API key. Status: ${response.status}`);
          console.error(`[SportSRC] Using API Key: ${SPORTSRC_API_KEY.substring(0, 8)}...${SPORTSRC_API_KEY.substring(SPORTSRC_API_KEY.length - 4)}`);
        }
        
        // For 500 errors, log more details
        if (response.status === 500) {
          console.error(`[SportSRC] Server error (500) - API might be down or request format is wrong`);
          console.error(`[SportSRC] Request URL: ${url.replace(SPORTSRC_API_KEY, '***')}`);
          console.error(`[SportSRC] Error response: ${errorText}`);
        }
        
        return null;
      }

      const responseData = await response.json();
      
      // Check for API error messages in response
      if (responseData.error || responseData.message) {
        console.warn(`[SportSRC] API returned error:`, responseData.error || responseData.message);
      }
      
      // Log API plan/account info if available
      if (responseData.account || responseData.plan) {
        console.log(`[SportSRC] API Account Info:`, {
          plan: responseData.plan || responseData.account?.plan,
          features: responseData.features || responseData.account?.features,
        });
      }
      console.log(`[SportSRC] Match detail response for ${matchId}:`, JSON.stringify(responseData, null, 2));
      
      // Handle nested response structure: data.data.match_info or data.match_info
      let matchData = responseData;
      if (responseData?.data) {
        // Check if data.data exists (double nested)
        if (responseData.data?.data?.match_info) {
          matchData = responseData.data.data.match_info;
        } else if (responseData.data?.match_info) {
          matchData = responseData.data.match_info;
        } else if (responseData.data?.id) {
          // Sometimes data itself is the match info
          matchData = responseData.data;
        }
      } else if (responseData?.match_info) {
        matchData = responseData.match_info;
      }
      
      // Validate response has required fields
      if (!matchData || !matchData.id) {
        console.warn(`[SportSRC] Invalid match detail response for ${matchId} - missing id field`);
        console.warn(`[SportSRC] Response keys:`, Object.keys(responseData || {}));
        console.warn(`[SportSRC] Match data keys:`, matchData ? Object.keys(matchData) : 'null');
        return null;
      }
      
      // Extract streaming data - check multiple possible locations
      // Check in matchData first, then responseData, then nested locations
      let streamingData = matchData.streaming ?? matchData.streams ?? matchData.links;
      
      // If not found in matchData, check responseData locations
      if (!streamingData) {
        streamingData = responseData.streaming ?? 
                       responseData.data?.streaming ?? 
                       responseData.data?.data?.streaming ??
                       responseData.data?.match_info?.streaming ??
                       responseData.match_info?.streaming;
      }
      
      // Log streaming data if present
      if (streamingData) {
        console.log(`[SportSRC] ✅ Streaming data found for ${matchId}:`, JSON.stringify(streamingData, null, 2));
      } else {
        console.warn(`[SportSRC] ⚠️ No streaming data in response for ${matchId}`);
        console.log(`[SportSRC] Checking all possible locations...`);
        console.log(`[SportSRC] matchData.streaming:`, matchData.streaming);
        console.log(`[SportSRC] matchData.streams:`, matchData.streams);
        console.log(`[SportSRC] matchData.links:`, matchData.links);
        console.log(`[SportSRC] responseData.streaming:`, responseData.streaming);
        console.log(`[SportSRC] responseData.data?.streaming:`, responseData.data?.streaming);
        console.log(`[SportSRC] responseData.data?.match_info?.streaming:`, responseData.data?.match_info?.streaming);
        console.log(`[SportSRC] All matchData keys:`, Object.keys(matchData));
        console.log(`[SportSRC] All responseData keys:`, Object.keys(responseData));
        
        // Check if streaming might be at top level of responseData
        if (responseData && typeof responseData === 'object') {
          const allKeys = Object.keys(responseData);
          console.log(`[SportSRC] Top-level response keys:`, allKeys);
          // Look for any key that might contain streaming data
          for (const key of allKeys) {
            if (key.toLowerCase().includes('stream') || key.toLowerCase().includes('embed') || key.toLowerCase().includes('link')) {
              console.log(`[SportSRC] Found potential streaming key "${key}":`, responseData[key]);
            }
          }
        }
      }
      
      // Return the match data with streaming info attached if found
      return {
        ...matchData,
        streaming: streamingData,
      };
    } catch (error) {
      console.error(`[SportSRC] Error fetching match detail for ${matchId}:`, error);
      return null;
    }
  }, 60000); // 1 minute cache for match details
};

/**
 * Normalize team name for matching
 * Enhanced to handle more variations and improve matching accuracy
 */
const normalizeTeamName = (name: string): string => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\s+(fc|cf|united|city|town|rovers|athletic|athletico|athletic club|club|cf|sc|afc|cfc|rfc|fc barcelona|real madrid)$/gi, '')
    // Remove common prefixes
    .replace(/^(atletico|atletico madrid|real|cf|fc|sc|ac)\s+/gi, '')
    // Handle U23, U21, U19 variations
    .replace(/\s+u\s*(\d+)\s*$/gi, '')
    .replace(/\bu\d{2}\b/gi, '')
    .replace(/\bu\.\d{2}\b/gi, '')
    // Normalize unicode characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove special characters but keep spaces
    .replace(/[^a-z0-9\s]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Calculate similarity between two strings (0-1)
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  // Exact match
  if (str1 === str2) return 1;
  
  // One contains the other
  if (str1.includes(str2) || str2.includes(str1)) return 0.8;
  
  // Word-by-word matching
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  let matches = 0;
  const total = Math.max(words1.length, words2.length);
  
  for (const word1 of words1) {
    if (words2.some(word2 => word1 === word2 || word1.includes(word2) || word2.includes(word1))) {
      matches++;
    }
  }
  
  return matches / total;
};

/**
 * Find matching SportSRC match by team names
 * Enhanced with fuzzy matching for better accuracy
 */
export const findMatchingSportSRCMatch = (
  homeTeamName: string,
  awayTeamName: string,
  sportsrcMatches: SportSRCMatch[]
): SportSRCMatch | null => {
  if (!homeTeamName || !awayTeamName || sportsrcMatches.length === 0) {
    return null;
  }
  
  const normalizedHome = normalizeTeamName(homeTeamName);
  const normalizedAway = normalizeTeamName(awayTeamName);
  
  let bestMatch: SportSRCMatch | null = null;
  let bestScore = 0;
  
  for (const match of sportsrcMatches) {
    const matchHome = normalizeTeamName(match.home_team || '');
    const matchAway = normalizeTeamName(match.away_team || '');
    
    // Calculate similarity scores
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
    // Partial match (both teams have some similarity)
    else if ((homeScore >= 0.5 || swappedHomeScore >= 0.5) && 
             (awayScore >= 0.5 || swappedAwayScore >= 0.5)) {
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
    // console.log(`[SportSRC] ✅ Match found with similarity score: ${(bestScore * 100).toFixed(0)}%`);
    return bestMatch;
  }
  
  return null;
};

/**
 * Get first non‑empty string from potential embed/stream URL fields.
 * Detail endpoint provides embed URL; support common variants.
 */
function getEmbedOrStreamUrl(d: any): string | null {
  if (!d) return null;
  const s = d.streaming;
  
  const v = (x: unknown) => {
    if (typeof x === 'string' && x.trim()) {
      const trimmed = x.trim();
      // Validate it looks like a URL
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
        return trimmed;
      }
      // Also accept iframe src patterns
      if (trimmed.startsWith('<iframe') || trimmed.includes('src=')) {
        return trimmed;
      }
    }
    return null;
  };
  
  // Try all possible locations for stream/embed URLs
  // Check if streaming is an object with nested properties
  let url: string | null = null;
  
  if (s && typeof s === 'object' && s !== null) {
    // Check all possible nested properties
    url = v(s.embed) ?? v(s.embed_url) ?? v(s.url) ?? v(s.stream_url) ?? v(s.streaming_url) ?? 
          v(s.link) ?? v(s.href) ?? v(s.src) ?? v(s.iframe) ?? v(s.iframe_url) ??
          null;
    
    // If streaming has a links array
    if (!url && Array.isArray(s.links) && s.links.length > 0) {
      for (const link of s.links) {
        const linkUrl = v(link?.url ?? link?.href ?? link?.embed ?? link?.src);
        if (linkUrl) {
          url = linkUrl;
          break;
        }
      }
    }
  }
  
  // Fallback to top-level properties
  if (!url) {
    url = v(d.embed) ?? v(d.embed_url) ?? v(d.stream_url) ?? v(d.streaming_url) ?? v(d.stream) ?? null;
  }
  
  return url;
}

/**
 * Extract streaming sources from SportSRC match detail.
 * Stream/embed URL is provided on the detail endpoint (per SportSRC support).
 */
export const extractSportSRCStreamSources = (matchDetail: SportSRCMatchDetail | any): StreamSource[] => {
  const sources: StreamSource[] = [];
  const id = matchDetail?.id ?? matchDetail?.match_id ?? matchDetail?.fixture_id ?? '';

  if (!id) {
    return sources;
  }

  // Check multiple possible locations for streaming data
  // Check streaming field - it might be null, undefined, empty object, or have data
  const streamingField = matchDetail?.streaming;
  const streamingData = streamingField ?? matchDetail?.streams ?? matchDetail?.links;
  
  // Also check nested locations
  const nestedStreaming = (matchDetail as any)?.data?.streaming ?? 
                         (matchDetail as any)?.match_info?.streaming ??
                         (matchDetail as any)?.data?.match_info?.streaming;
  
  // Use nested streaming if main streaming is not available
  const finalStreamingData = streamingData || nestedStreaming;
  
  // First, try to get embed/stream URL from common locations
  const embed = getEmbedOrStreamUrl(matchDetail);
  if (embed) {
    sources.push({
      source: 'embed',
      id,
      provider: 'sportsrc',
      embedUrl: embed,
    });
    return sources;
  }
  
  // Also try with nested streaming data if available
  if (nestedStreaming && !streamingData) {
    const nestedEmbed = getEmbedOrStreamUrl({ streaming: nestedStreaming });
    if (nestedEmbed) {
      sources.push({
        source: 'embed',
        id,
        provider: 'sportsrc',
        embedUrl: nestedEmbed,
      });
      return sources;
    }
  }

  // Try streaming.links array
  const s = finalStreamingData;
  if (s?.links && Array.isArray(s.links) && s.links.length > 0) {
    s.links.forEach((link: any, index: number) => {
      const url = link?.url ?? link?.href ?? link?.embed ?? link?.stream_url ?? link?.src;
      if (typeof url === 'string' && url.trim()) {
        const trimmedUrl = url.trim();
        // Validate URL
        if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('//')) {
          sources.push({ 
            source: `link-${index}`, 
            id, 
            provider: 'sportsrc', 
            embedUrl: trimmedUrl 
          });
        }
      }
    });
    
    if (sources.length > 0) {
      return sources;
    }
  }

  // Try direct streaming.url if it exists
  if (s?.url && typeof s.url === 'string' && s.url.trim()) {
    const url = s.url.trim();
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      sources.push({
        source: 'stream',
        id,
        provider: 'sportsrc',
        embedUrl: url,
      });
      return sources;
    }
  }

  // Try if streaming data is an array directly
  if (Array.isArray(finalStreamingData) && finalStreamingData.length > 0) {
    finalStreamingData.forEach((item: any, index: number) => {
      const url = item?.url ?? item?.href ?? item?.embed ?? item?.stream_url ?? item?.src ?? item;
      if (typeof url === 'string' && url.trim()) {
        const trimmedUrl = url.trim();
        if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('//')) {
          sources.push({
            source: `stream-${index}`,
            id,
            provider: 'sportsrc',
            embedUrl: trimmedUrl,
          });
        }
      }
    });
    
    if (sources.length > 0) {
      return sources;
    }
  }

  return sources;
};


