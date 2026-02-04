import { Team, Match } from '@/data/mockData';
import { LeagueGroup, League } from '@/types/league';

// FlashScore API Types
interface FlashScoreTeam {
  team_id: string;
  name: string;
  short_name: string;
  smaill_image_path?: string; // Present in list API (typo in API)
  small_image_path?: string;  // Present in details API (correct spelling)
  image_path?: string;        // Fallback
  red_cards: number;
}

interface FlashScoreMatch {
  match_id: string;
  timestamp: number;
  match_status: {
    stage: string | null;
    is_cancelled: boolean;
    is_postponed: boolean;
    is_started: boolean;
    is_in_progress: boolean;
    is_finished: boolean;
    live_time: string | null;
  };
  home_team: FlashScoreTeam;
  away_team: FlashScoreTeam;
  scores: {
    home: number | null;
    away: number | null;
    home_1st_half?: number | null;
    away_1st_half?: number | null;
    home_2nd_half?: number | null;
    away_2nd_half?: number | null;
  };
  odds?: {
    "1": number;
    "2": number;
    "X": number;
  };
}

interface FlashScoreTournament {
  name: string;
  country_name: string;
  tournament_url: string;
  image_path: string;
  matches?: FlashScoreMatch[];
}

export interface LineupPlayer {
  player_id: string;
  name: string;
  number: string;
  image_path: string;
  position?: string;
}

export interface TeamLineup {
  side: 'home' | 'away';
  formation: string;
  startingLineups: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach?: { name: string; image_path?: string };
}

export interface H2HMatch {
  match_id: string;
  timestamp: number;
  status: 'W' | 'L' | 'D';
  tournament: { name: string; shortName?: string };
  homeTeam: { name: string; logo: string };
  awayTeam: { name: string; logo: string };
  score: { home: string; away: string };
}

export interface MatchSummaryEvent {
  player_id?: string;
  player_url?: string;
  minutes: string;
  name: string;
  team: 'home' | 'away';
  description: string;
  type: string;
}

export interface Sport {
  id: number;
  name: string;
}

export interface Country {
  country_id: string;
  name: string;
}

export interface TournamentInfo {
  tournament_id: string;
  name: string;
  image_path?: string;
}

// API Configuration
const FLASHSCORE_API_BASE = 'https://flashscore4.p.rapidapi.com';

// Safe environment variable access
const getEnvVar = (key: string): string | undefined => {
  try {
    // Check if running in Vite/Browser environment
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore errors in non-standard environments
  }
  return undefined;
};

const FLASHSCORE_API_KEY = getEnvVar('VITE_FLASHSCORE_API_KEY') || 'bffdb88075msh1832f65b5a81519p1ea775jsn5ca875a7973e';

// Request cache to avoid redundant API calls
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds cache for live matches, longer for others

// Helper to get cached data or fetch new
const getCachedOrFetch = async (cacheKey: string, fetchFn: () => Promise<any>, cacheTime: number = CACHE_DURATION): Promise<any> => {
  const cached = requestCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < cacheTime) {
    return cached.data;
  }
  
  const data = await fetchFn();
  requestCache.set(cacheKey, { data, timestamp: now });
  
  // Clean old cache entries (older than 1 minute)
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > 60000) {
      requestCache.delete(key);
    }
  }
  
  return data;
};

// Transform FlashScore team to our Team interface
const transformTeam = (fsTeam: any, teamId: string): Team => {
  // Handle missing team data
  if (!fsTeam) {
    return {
      id: teamId || 'unknown',
      name: 'Unknown Team',
      shortName: 'UNK',
      logo: '',
    };
  }

  // Handle different image path properties from different API endpoints
  const logo = fsTeam.smaill_image_path || fsTeam.small_image_path || fsTeam.image_path || '';
  
  return {
    id: teamId,
    name: fsTeam.name || 'Unknown',
    shortName: fsTeam.short_name || fsTeam.name?.substring(0, 3).toUpperCase() || 'UNK',
    logo: logo,
  };
};

// Transform FlashScore match to our Match interface
const transformMatch = (
  fsMatch: FlashScoreMatch, 
  competition: string, 
  status: 'live' | 'upcoming' | 'finished' = 'live',
  minute?: number
): Match => {
  // Safety check for match data
  if (!fsMatch) {
    throw new Error('Match data is missing');
  }

  const homeId = fsMatch.home_team?.team_id || `home-${fsMatch.match_id}`;
  const awayId = fsMatch.away_team?.team_id || `away-${fsMatch.match_id}`;

  const homeTeam = transformTeam(fsMatch.home_team, homeId);
  const awayTeam = transformTeam(fsMatch.away_team, awayId);
  
  // Use passed status and minute, or derive from match_status if not provided
  let derivedStatus = status;
  let derivedMinute = minute;

  if (fsMatch.match_status) {
      if (fsMatch.match_status.is_finished) {
          derivedStatus = 'finished';
      } else if (fsMatch.match_status.is_in_progress) {
          derivedStatus = 'live';
          // Try to parse minute from live_time
          if (fsMatch.match_status.live_time) {
              if (fsMatch.match_status.live_time === 'Half Time') {
                  derivedMinute = 45; // Or handle specially
              } else {
                  const parsed = parseInt(fsMatch.match_status.live_time);
                  if (!isNaN(parsed)) {
                      derivedMinute = parsed;
                  }
              }
          }
      } else if (fsMatch.match_status.is_cancelled || fsMatch.match_status.is_postponed) {
          derivedStatus = 'finished'; // Treat cancelled as finished/recent
      } else if (!fsMatch.match_status.is_started) {
          derivedStatus = 'upcoming';
      }
  }

  // Convert timestamp to time string (HH:MM format)
  let startTime: string | undefined = undefined;
  if (fsMatch.timestamp) {
    const date = new Date(fsMatch.timestamp * 1000);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    startTime = `${hours}:${minutes}`;
  }
  
  return {
    id: fsMatch.match_id,
    homeTeam,
    awayTeam,
    // Handle null scores properly - keep as null for display (will show as "-")
    homeScore: fsMatch.scores.home !== null && fsMatch.scores.home !== undefined 
      ? fsMatch.scores.home 
      : null,
    awayScore: fsMatch.scores.away !== null && fsMatch.scores.away !== undefined 
      ? fsMatch.scores.away 
      : null,
    status: derivedStatus,
    minute: derivedMinute,
    competition,
    startTime,
    streamUrl: undefined,
  };
};

// FlashScore API Service
export const flashscoreApi = {
  /**
   * Get live matches from FlashScore API grouped by league
   */
  async getLiveMatchesGrouped(): Promise<LeagueGroup[]> {
    const cacheKey = 'live-matches-grouped';
    return getCachedOrFetch(cacheKey, async () => {
      try {
        const response = await fetch(`${FLASHSCORE_API_BASE}/api/flashscore/v2/matches/live?sport_id=1`, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
            'x-rapidapi-key': FLASHSCORE_API_KEY,
          },
        });

        if (!response.ok) {
          console.error(`[FlashScore] API error: ${response.status} ${response.statusText}`);
          // Return empty array instead of throwing to prevent crashes
          return [];
        }

        const data: FlashScoreTournament[] = await response.json();
        
        if (!Array.isArray(data)) {
          console.error('[FlashScore] Invalid response format:', data);
          return [];
        }

        // Group matches by league/tournament
        const leagueGroupsMap = new Map<string, LeagueGroup>();
      
        for (const tournament of data) {
          if (!tournament.matches || !Array.isArray(tournament.matches) || tournament.matches.length === 0) continue;

          // Properly parse status and minute for live matches
          const matches: Match[] = tournament.matches
            .map(fsMatch => {
              // Status and minute will be derived inside transformMatch from match_status
              // But we can pass 'live' as a hint/default since we are in getLiveMatches
              return transformMatch(fsMatch, tournament.name, 'live');
            })
            .filter(match => match.status === 'live'); // Only keep actual live matches

          if (matches.length === 0) continue;

          const leagueId = tournament.tournament_url || tournament.name.toLowerCase().replace(/\s+/g, '-');
          
          if (leagueGroupsMap.has(leagueId)) {
            // Append matches to existing league group
            const existingGroup = leagueGroupsMap.get(leagueId)!;
            existingGroup.matches.push(...matches);
          } else {
            // Create new league group
            const league: League = {
              id: leagueId,
              name: tournament.name,
              country: tournament.country_name,
              logo: tournament.image_path,
              url: tournament.tournament_url,
            };
            
            leagueGroupsMap.set(leagueId, { league, matches });
          }
        }

        return Array.from(leagueGroupsMap.values());
      } catch (error) {
        console.error('[FlashScore] Error fetching live matches:', error);
        // Return empty array instead of throwing to prevent crashes
        return [];
      }
    }, 3000); // 3 second cache for live matches
  },

  /**
   * Get live matches from FlashScore API (flat list for backward compatibility)
   */
  async getLiveMatches(): Promise<Match[]> {
    try {
      const groups = await this.getLiveMatchesGrouped();
      // Flatten all matches from all leagues
      return groups.flatMap(group => group.matches);
    } catch (error) {
      console.error('Error fetching live matches from FlashScore:', error);
      throw error;
    }
  },

  /**
   * Get upcoming matches (matches scheduled for tomorrow)
   */
  async getUpcomingMatches(): Promise<Match[]> {
    try {
      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      
      const groups = await this.getMatchesForDate(dateStr, 'upcoming');
      return groups.flatMap(group => group.matches);
    } catch (error) {
      console.error('Error fetching upcoming matches:', error);
      return [];
    }
  },

  /**
   * Get recent/finished matches (matches from yesterday)
   */
  async getRecentMatches(): Promise<Match[]> {
    try {
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      
      const groups = await this.getMatchesForDate(dateStr, 'finished');
      return groups.flatMap(group => group.matches);
    } catch (error) {
      console.error('Error fetching recent matches:', error);
      return [];
    }
  },

  /**
   * Get matches for a specific date
   * Format: YYYY-MM-DD (e.g., "2025-12-22") or "0" for today
   * Optionally filter by status: 'live' | 'upcoming' | 'finished'
   */
  async getMatchesForDate(date: string, filterStatus?: 'live' | 'upcoming' | 'finished'): Promise<LeagueGroup[]> {
    // Convert "0" or "today" to YYYY-MM-DD
    let apiDate = date;
    if (date === '0' || date === 'today') {
      const today = new Date();
      apiDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    
    const cacheKey = `matches-date-${apiDate}-${filterStatus || 'all'}`;
    const cacheTime = filterStatus === 'live' ? 3000 : 30000; // 3s for live, 30s for others
    
    return getCachedOrFetch(cacheKey, async () => {
      // Calculate day difference from today
      const today = new Date();
      // Reset time to 00:00:00 for accurate day calculation
      today.setHours(0, 0, 0, 0);
      
      // Parse apiDate (YYYY-MM-DD) manually to ensure local time 00:00:00
      // This avoids timezone issues where new Date("YYYY-MM-DD") might be treated as UTC
      const [year, month, day] = apiDate.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      let url = `${FLASHSCORE_API_BASE}/api/flashscore/v2/matches/list-by-date?date=${apiDate}&sport_id=1`;
      
      // Use list endpoint if within +/- 7 days range
      // This endpoint is more reliable for upcoming/recent matches
      if (diffDays >= -7 && diffDays <= 7) {
        url = `${FLASHSCORE_API_BASE}/api/flashscore/v2/matches/list?day=${diffDays}&sport_id=1`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          'x-rapidapi-key': FLASHSCORE_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`FlashScore API error: ${response.status} ${response.statusText}`);
      }

      const data: FlashScoreTournament[] = await response.json();
      
      // Group matches by league/tournament
      const leagueGroupsMap = new Map<string, LeagueGroup>();
      
      for (const tournament of data) {
        if (!tournament.matches || !Array.isArray(tournament.matches) || tournament.matches.length === 0) continue;

        // Transform matches and filter by status
        const matches: Match[] = tournament.matches
          .map(fsMatch => {
            // transformMatch will derive status from match_status
            // We pass 'upcoming' as a default/hint but it will be overridden
            return transformMatch(fsMatch, tournament.name, 'upcoming');
          })
          .filter(match => {
            if (!filterStatus) return true;
            return match.status === filterStatus;
          });

        // Only add league if it has matches after filtering
        if (matches.length > 0) {
          const leagueId = tournament.tournament_url || tournament.name.toLowerCase().replace(/\s+/g, '-');
          
          if (leagueGroupsMap.has(leagueId)) {
            // Append matches to existing league group
            const existingGroup = leagueGroupsMap.get(leagueId)!;
            existingGroup.matches.push(...matches);
          } else {
            const league: League = {
              id: leagueId,
              name: tournament.name,
              country: tournament.country_name,
              logo: tournament.image_path,
              url: tournament.tournament_url,
            };
            leagueGroupsMap.set(leagueId, { league, matches });
          }
        }
      }

      return Array.from(leagueGroupsMap.values());
    }, cacheTime);
  },

  /**
   * Check if a date string represents today
   */
  isToday(dateStr: string): boolean {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr === todayStr;
  },

  /**
   * Get match details by match ID
   */
  async getMatchDetails(matchId: string): Promise<Match & { 
    venueDetails?: { name: string; city: string; attendance?: string; capacity?: string };
    referee?: string;
    tournament?: { name: string; url: string };
    country?: string;
    score1stHalf?: { home: number; away: number };
    score2ndHalf?: { home: number; away: number };
  }> {
    const cacheKey = `match-details-${matchId}`;
    return getCachedOrFetch(cacheKey, async () => {
      // Updated to v2 endpoint
      const response = await fetch(`${FLASHSCORE_API_BASE}/api/flashscore/v2/matches/details?match_id=${matchId}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          'x-rapidapi-key': FLASHSCORE_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`FlashScore API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Determine status and minute from match_status object (v2 structure)
      let status: 'live' | 'upcoming' | 'finished' = 'upcoming';
      let minute: number | undefined = undefined;

      if (data.match_status) {
        if (data.match_status.is_finished) {
          status = 'finished';
        } else if (data.match_status.is_in_progress) {
          status = 'live';
          if (data.match_status.live_time) {
            if (data.match_status.live_time === 'Half Time') {
              minute = 45;
            } else {
              const parsed = parseInt(data.match_status.live_time);
              if (!isNaN(parsed)) {
                minute = parsed;
              }
            }
          }
        } else if (data.match_status.is_started === false) {
           status = 'upcoming';
        }
      }

      // Convert timestamp to time string
      let startTime: string | undefined = undefined;
      if (data.timestamp) {
        const date = new Date(data.timestamp * 1000);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        startTime = `${hours}:${minutes}`;
      }

      const homeTeam = transformTeam(data.home_team, data.home_team.team_id);
      const awayTeam = transformTeam(data.away_team, data.away_team.team_id);

      // Parse scores from data.scores object (v2 structure)
      const homeScore = data.scores?.home !== null && data.scores?.home !== undefined ? parseInt(data.scores.home) : 0;
      const awayScore = data.scores?.away !== null && data.scores?.away !== undefined ? parseInt(data.scores.away) : 0;
      
      const score1stHalf = data.scores?.home_1st_half !== null && data.scores?.home_1st_half !== undefined && data.scores?.away_1st_half !== null && data.scores?.away_1st_half !== undefined ? {
        home: parseInt(data.scores.home_1st_half),
        away: parseInt(data.scores.away_1st_half),
      } : undefined;

      const score2ndHalf = data.scores?.home_2nd_half !== null && data.scores?.home_2nd_half !== undefined && data.scores?.away_2nd_half !== null && data.scores?.away_2nd_half !== undefined ? {
        home: parseInt(data.scores.home_2nd_half),
        away: parseInt(data.scores.away_2nd_half),
      } : undefined;

      return {
        id: data.match_id,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        status,
        minute,
        competition: data.tournament?.name || '',
        venue: data.venue?.name,
        startTime,
        streamUrl: undefined,
        referee: data.referee,
        tournament: data.tournament ? {
          name: data.tournament.name,
          url: data.tournament.tournament_url,
        } : undefined,
        country: data.country?.name,
        score1stHalf,
        score2ndHalf,
      } as Match & { 
        venueDetails?: { name: string; city: string; attendance?: string; capacity?: string };
        referee?: string;
        tournament?: { name: string; url: string };
        country?: string;
        score1stHalf?: { home: number; away: number };
        score2ndHalf?: { home: number; away: number };
      };
    }, 10000); // 10 second cache for match details
  },

  /**
   * Get match statistics
   */
  async getMatchStats(matchId: string): Promise<{
    match: Array<{ name: string; home_team: number | string; away_team: number | string }>;
    '1st-half': Array<{ name: string; home_team: number | string; away_team: number | string }>;
    '2nd-half': Array<{ name: string; home_team: number | string; away_team: number | string }>;
  }> {
    const cacheKey = `match-stats-${matchId}`;
    return getCachedOrFetch(cacheKey, async () => {
      const response = await fetch(`${FLASHSCORE_API_BASE}/api/flashscore/v2/matches/match/stats?match_id=${matchId}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          'x-rapidapi-key': FLASHSCORE_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`FlashScore API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    }, 30000); // 30 second cache for match stats
  },

  /**
   * Get match lineups
   */
  async getMatchLineups(matchId: string): Promise<{ home: TeamLineup; away: TeamLineup } | null> {
    const cacheKey = `match-lineups-${matchId}`;
    return getCachedOrFetch(cacheKey, async () => {
      const response = await fetch(`${FLASHSCORE_API_BASE}/api/flashscore/v2/matches/match/lineups?match_id=${matchId}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          'x-rapidapi-key': FLASHSCORE_API_KEY,
        },
      });

      if (!response.ok) {
        // Lineups might not be available
        return null;
      }

      const data = await response.json();
      
      // Parse response which might be array-like object {0: {...}, 1: {...}}
      const lineups = Object.values(data);
      const homeData = lineups.find((l: any) => l.side === 'home');
      const awayData = lineups.find((l: any) => l.side === 'away');

      if (!homeData && !awayData) return null;

      const mapPlayers = (players: any[]) => {
        if (!players) return [];
        return players.map((p: any) => ({
          player_id: p.player_id,
          name: p.name,
          number: p.number,
          image_path: p.image_path,
          position: p.position
        }));
      };

      const mapLineup = (data: any): TeamLineup => ({
        side: data.side,
        formation: data.formation || data.predictedFormation || '',
        startingLineups: mapPlayers(data.starting_lineups || data.predictedLineups),
        substitutes: mapPlayers(data.substitutes),
        coach: data.coach ? { name: data.coach.name, image_path: data.coach.image_path } : undefined
      });

      return {
        home: homeData ? mapLineup(homeData) : { side: 'home', formation: '', startingLineups: [], substitutes: [] },
        away: awayData ? mapLineup(awayData) : { side: 'away', formation: '', startingLineups: [], substitutes: [] }
      };
    }, 60000); // 1 minute cache
  },

  /**
   * Get match H2H
   */
  async getMatchH2H(matchId: string): Promise<H2HMatch[]> {
    const cacheKey = `match-h2h-${matchId}`;
    return getCachedOrFetch(cacheKey, async () => {
      const response = await fetch(`${FLASHSCORE_API_BASE}/api/flashscore/v2/matches/h2h?match_id=${matchId}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          'x-rapidapi-key': FLASHSCORE_API_KEY,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      return data.map((m: any) => ({
        match_id: m.match_id,
        timestamp: m.timestamp,
        status: m.status,
        tournament: {
          name: m.tournament_name,
          shortName: m.tournament_name_short
        },
        homeTeam: {
          name: m.home_team.name,
          logo: m.home_team.image_path
        },
        awayTeam: {
          name: m.away_team.name,
          logo: m.away_team.image_path
        },
        score: {
          home: m.scores.home,
          away: m.scores.away
        }
      }));
    }, 60000); // 1 minute cache
  },

  /**
   * Get match summary (events)
   */
  async getMatchSummary(matchId: string): Promise<MatchSummaryEvent[]> {
    const cacheKey = `match-summary-${matchId}`;
    return getCachedOrFetch(cacheKey, async () => {
      const response = await fetch(`${FLASHSCORE_API_BASE}/api/flashscore/v2/matches/match/summary?match_id=${matchId}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          'x-rapidapi-key': FLASHSCORE_API_KEY,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) return [];
      
      return data.map((e: any) => ({
        player_id: e.player_id,
        player_url: e.player_url,
        minutes: e.minutes,
        name: e.name,
        team: e.team,
        description: e.description,
        type: e.type
      }));
    }, 30000); // 30 seconds cache
  },

  async getSports(): Promise<Sport[]> {
    const cacheKey = 'general-sports';
    return getCachedOrFetch(cacheKey, async () => {
      const response = await fetch(`${FLASHSCORE_API_BASE}/api/flashscore/v2/general/sports`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          'x-rapidapi-key': FLASHSCORE_API_KEY,
        },
      });

      if (!response.ok) return [];
      const data = await response.json();
      // Ensure data is in expected format (array of {id, name})
      return Array.isArray(data) ? data : [];
    }, 86400000); // 24 hours cache (sports don't change often)
  },

  async getCountries(sportId: number): Promise<Country[]> {
    const cacheKey = `general-countries-${sportId}`;
    return getCachedOrFetch(cacheKey, async () => {
      const response = await fetch(`${FLASHSCORE_API_BASE}/api/flashscore/v2/general/countries?sport_id=${sportId}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          'x-rapidapi-key': FLASHSCORE_API_KEY,
        },
      });

      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }, 86400000); // 24 hours cache
  },

  async getTournaments(sportId: number, countryId: string): Promise<TournamentInfo[]> {
    const cacheKey = `general-tournaments-${sportId}-${countryId}`;
    return getCachedOrFetch(cacheKey, async () => {
      const response = await fetch(`${FLASHSCORE_API_BASE}/api/flashscore/v2/general/tournaments?sport_id=${sportId}&country_id=${countryId}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          'x-rapidapi-key': FLASHSCORE_API_KEY,
        },
      });

      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }, 3600000); // 1 hour cache
  }
};

