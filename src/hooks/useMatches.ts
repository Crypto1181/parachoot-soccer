import { useState, useEffect, useRef, useCallback } from 'react';
import { Match } from '@/data/mockData';
import { LeagueGroup } from '@/types/league';
import { matchesService } from '@/lib/supabaseService';
import { flashscoreApi, TeamLineup, H2HMatch, MatchSummaryEvent } from '@/lib/flashscoreApi';
import { getWeStreamLiveLeagueGroups, getWeStreamMatchById, clearWeStreamCache } from '@/lib/westreamApi';
import { getSportSRCMatchById } from '@/lib/sportsrcApi';

export const useMatches = (status?: 'live' | 'upcoming' | 'finished', autoRefresh?: boolean) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        setError(null);
        let data: Match[] = [];

        // Use FlashScore API for live matches, Supabase for others
        if (status === 'live') {
          try {
            data = await flashscoreApi.getLiveMatches();
          } catch (apiError) {
            console.warn('FlashScore API failed, falling back to Supabase:', apiError);
            // Fallback to Supabase if API fails
            data = await matchesService.getByStatus('live');
          }
        } else if (status === 'upcoming') {
          // Try FlashScore first, then fallback to Supabase
          try {
            data = await flashscoreApi.getUpcomingMatches();
            if (data.length === 0) {
              data = await matchesService.getByStatus('upcoming');
            }
          } catch (apiError) {
            data = await matchesService.getByStatus('upcoming');
          }
        } else if (status === 'finished') {
          // Try FlashScore first, then fallback to Supabase
          try {
            data = await flashscoreApi.getRecentMatches();
            
            // Filter out matches with no scores (e.g. postponed/cancelled matches marked as finished)
            data = data.filter(m => 
              (m.homeScore !== null && m.homeScore !== undefined) || 
              (m.awayScore !== null && m.awayScore !== undefined)
            );

            if (data.length === 0) {
              data = await matchesService.getByStatus('finished');
            }
          } catch (apiError) {
            data = await matchesService.getByStatus('finished');
          }
        } else {
          // Get all matches - prioritize live from FlashScore
          const [liveMatches, allSupabaseMatches] = await Promise.all([
            flashscoreApi.getLiveMatches().catch(() => []),
            matchesService.getAll(),
          ]);

          // Combine: live from FlashScore, others from Supabase
          const supabaseLive = allSupabaseMatches.filter(m => m.status === 'live');
          const otherMatches = allSupabaseMatches.filter(m => m.status !== 'live');
          data = [...liveMatches, ...otherMatches];
        }

        setMatches(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch matches'));
        console.error('Error fetching matches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();

    // Auto-refresh for live matches (every 30 seconds)
    if (status === 'live' && autoRefresh !== false) {
      intervalRef.current = setInterval(() => {
        fetchMatches();
      }, 30000); // Refresh every 30 seconds
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, autoRefresh]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      let data: Match[] = [];

      // Use FlashScore API for live matches, Supabase for others
      if (status === 'live') {
        try {
          data = await flashscoreApi.getLiveMatches();
        } catch (apiError) {
          console.warn('FlashScore API failed, falling back to Supabase:', apiError);
          data = await matchesService.getByStatus('live');
        }
      } else if (status === 'upcoming') {
        try {
          data = await flashscoreApi.getUpcomingMatches();
          if (data.length === 0) {
            data = await matchesService.getByStatus('upcoming');
          }
        } catch (apiError) {
          data = await matchesService.getByStatus('upcoming');
        }
      } else if (status === 'finished') {
        try {
          data = await flashscoreApi.getRecentMatches();
          if (data.length === 0) {
            data = await matchesService.getByStatus('finished');
          }
        } catch (apiError) {
          data = await matchesService.getByStatus('finished');
        }
      } else {
        const [liveMatches, allSupabaseMatches] = await Promise.all([
          flashscoreApi.getLiveMatches().catch(() => []),
          matchesService.getAll(),
        ]);
        const supabaseLive = allSupabaseMatches.filter(m => m.status === 'live');
        const otherMatches = allSupabaseMatches.filter(m => m.status !== 'live');
        data = [...liveMatches, ...otherMatches];
      }

      setMatches(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch matches'));
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  return { matches, loading, error, refetch };
};

export const useMatchesGrouped = (status?: 'live' | 'upcoming' | 'finished', autoRefresh?: boolean, date?: string) => {
  const [leagueGroups, setLeagueGroups] = useState<LeagueGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      let groups: LeagueGroup[] = [];

      // Always use date-based API (date can be "today" or a date string)
      // If no date provided, default to "today"
      const dateToUse = date || 'today';

      try {
        // Filter matches by status when using date API
        groups = await flashscoreApi.getMatchesForDate(dateToUse, status);
      } catch (apiError) {
        console.warn('FlashScore date API failed:', apiError);
        // Only fallback to Supabase if API completely fails
        // Don't fallback for upcoming/finished - let it show empty rather than dummy data
        if (status === 'live') {
          try {
            groups = await flashscoreApi.getLiveMatchesGrouped();
          } catch (liveError) {
            console.warn('Live API also failed, using empty array');
            groups = [];
          }
        } else {
          // For upcoming/finished, return empty array instead of dummy data
          groups = [];
        }
      }

      // Legacy code path removed - always use date API
      if (false) {
        // Use FlashScore API for live matches grouped by league
        if (status === 'live') {
          try {
            groups = await flashscoreApi.getLiveMatchesGrouped();
          } catch (apiError) {
            console.warn('FlashScore API failed, falling back to Supabase:', apiError);
            // Fallback: group Supabase matches by competition
            const matches = await matchesService.getByStatus('live');
            // Group by competition
            const grouped = matches.reduce((acc, match) => {
              const existing = acc.find(g => g.league.name === match.competition);
              if (existing) {
                existing.matches.push(match);
              } else {
                acc.push({
                  league: {
                    id: match.competition.toLowerCase().replace(/\s+/g, '-'),
                    name: match.competition,
                    country: '',
                  },
                  matches: [match],
                });
              }
              return acc;
            }, [] as LeagueGroup[]);
            groups = grouped;
          }
        } else {
          // For upcoming/finished, group Supabase matches
          const matches = await matchesService.getByStatus(status || 'upcoming');
          const grouped = matches.reduce((acc, match) => {
            const existing = acc.find(g => g.league.name === match.competition);
            if (existing) {
              existing.matches.push(match);
            } else {
              acc.push({
                league: {
                  id: match.competition.toLowerCase().replace(/\s+/g, '-'),
                  name: match.competition,
                  country: '',
                },
                matches: [match],
              });
            }
            return acc;
          }, [] as LeagueGroup[]);
          groups = grouped;
        }
      }

      setLeagueGroups(groups);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch matches'));
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();

    // Auto-refresh for live matches (every 30 seconds)
    if (status === 'live' && autoRefresh !== false && !date) {
      intervalRef.current = setInterval(() => {
        fetchMatches();
      }, 30000); // Refresh every 30 seconds
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, autoRefresh, date]);

  return { leagueGroups, loading, error, refetch: fetchMatches };
};

export const useMatch = (id: string, autoRefresh = true) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMatch = useCallback(async () => {
    if (!id) {
      setMatch(null);
      setLoading(false);
      return;
    }
    try {
      // Don't set loading to true on background refreshes if we already have data
      setLoading(prev => !prev ? false : true);
      setError(null);

      // Handle SportsRC matches (Live TV page)
      if (id.startsWith('sportsrc-')) {
        const realId = id.replace(/^sportsrc-/, '');
        // console.log(`[useMatch] Fetching SportsRC match: ${realId}`);
        const data = await getSportSRCMatchById(realId);
        setMatch(data ?? null);
        return;
      }

      // Handle WeStream matches (Live TV page)
      if (id.startsWith('westream-')) {
        const realId = id.replace(/^westream-/, '');
        const weStreamMatch = await getWeStreamMatchById(realId);
        
        if (weStreamMatch) {
          // Try to enrich with FlashScore live data (scores, time, etc.)
          try {
            // Fetch live matches from FlashScore
            const liveMatches = await flashscoreApi.getLiveMatches();
            
            // Find matching match using fuzzy name matching
            const matchingFsMatch = liveMatches.find(fsMatch => {
              // Normalize names for comparison
              const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
              
              const wsHome = norm(weStreamMatch.homeTeam.name);
              const wsAway = norm(weStreamMatch.awayTeam.name);
              const fsHome = norm(fsMatch.homeTeam.name);
              const fsAway = norm(fsMatch.awayTeam.name);
              
              // Direct match check
              if (wsHome === fsHome && wsAway === fsAway) return true;
              
              // Partial match check (e.g. "Man City" vs "Manchester City")
              const homeMatch = wsHome.includes(fsHome) || fsHome.includes(wsHome);
              const awayMatch = wsAway.includes(fsAway) || fsAway.includes(wsAway);
              
              return homeMatch && awayMatch;
            });

            if (matchingFsMatch) {
              console.log(`[useMatch] Found FlashScore match for WeStream: ${weStreamMatch.homeTeam.name} vs ${weStreamMatch.awayTeam.name}`);
              // Merge FlashScore data into WeStream match
              // Prioritize FlashScore for scores, time, status
              setMatch({
                ...weStreamMatch,
                homeScore: matchingFsMatch.homeScore,
                awayScore: matchingFsMatch.awayScore,
                status: matchingFsMatch.status,
                minute: matchingFsMatch.minute,
                // Keep WeStream ID and stream/source info
                id: weStreamMatch.id,
                streamUrl: weStreamMatch.streamUrl,
              });
              return;
            }
          } catch (fsError) {
            console.warn('[useMatch] Failed to enrich WeStream match with FlashScore data:', fsError);
          }
          
          setMatch(weStreamMatch);
        } else {
          setMatch(null);
        }
        return;
      }

      try {
        const data = await flashscoreApi.getMatchDetails(id);
        setMatch(data);
      } catch (apiError) {
        console.warn('FlashScore API failed, falling back to Supabase:', apiError);
        const data = await matchesService.getById(id);
        setMatch(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch match'));
      // Don't clear match on error if we have one (keep stale data)
      if (!match) setMatch(null);
      console.error('Error fetching match:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatch();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchMatch, 30000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMatch, autoRefresh]);

  return { match, loading, error, refetch: fetchMatch };
};

/**
 * Hook to fetch match statistics (FlashScore).
 * Set enabled=false for matches without stats support.
 */
export const useMatchStats = (matchId: string | undefined, enabled = true) => {
  const [stats, setStats] = useState<{
    match: Array<{ name: string; home_team: number | string; away_team: number | string }>;
    '1st-half': Array<{ name: string; home_team: number | string; away_team: number | string }>;
    '2nd-half': Array<{ name: string; home_team: number | string; away_team: number | string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!matchId || !enabled) {
      setStats(null);
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await flashscoreApi.getMatchStats(matchId);
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch match stats'));
        console.error('Error fetching match stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [matchId, enabled]);

  return { stats, loading, error };
};


/**
 * Hook to fetch match lineups (FlashScore).
 */
export const useMatchLineups = (matchId: string | undefined, enabled = true) => {
  const [lineups, setLineups] = useState<{ home: TeamLineup; away: TeamLineup } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!matchId || !enabled) {
      setLineups(null);
      setLoading(false);
      return;
    }

    const fetchLineups = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await flashscoreApi.getMatchLineups(matchId);
        setLineups(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch match lineups'));
        console.error('Error fetching match lineups:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLineups();
  }, [matchId, enabled]);

  return { lineups, loading, error };
};

/**
 * Hook to fetch match H2H (FlashScore).
 */
export const useMatchH2H = (matchId: string | undefined, enabled = true) => {
  const [h2h, setH2H] = useState<H2HMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!matchId || !enabled) {
      setH2H([]);
      setLoading(false);
      return;
    }

    const fetchH2H = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await flashscoreApi.getMatchH2H(matchId);
        setH2H(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch match H2H'));
        console.error('Error fetching match H2H:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchH2H();
  }, [matchId, enabled]);

  return { h2h, loading, error };
};

export const useMatchSummary = (matchId: string | undefined, enabled = true) => {
  const [summary, setSummary] = useState<MatchSummaryEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!matchId || !enabled) {
      setSummary(null);
      setLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await flashscoreApi.getMatchSummary(matchId);
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch match summary'));
        console.error('Error fetching match summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [matchId, enabled]);

  return { summary, loading, error };
};

/**
 * Hook for Live TV page: WeStream API (provides all matches with streams)
 * WeStream is the primary source - free API with working endpoints
 * Documentation: https://westream.su/
 */
export const useLiveTVMatches = (autoRefresh = true) => {
  const [leagueGroups, setLeagueGroups] = useState<LeagueGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMatches = useCallback(async (bypassCache = false) => {
    try {
      setLoading(true);
      setError(null);
      if (bypassCache) {
        clearWeStreamCache();
      }

      // Use WeStream API EXCLUSIVELY for Live TV page
      // WeStream provides all matches with streams - free, no auth required
      console.log('[LiveTV] Fetching matches from WeStream API (exclusive source)...');
      const groups = await getWeStreamLiveLeagueGroups(bypassCache);
      
      if (groups.length === 0) {
        console.log('[LiveTV] ⚠️ WeStream returned no matches. This may be normal if no live matches are available.');
      } else {
        const totalMatches = groups.reduce((sum, g) => sum + g.matches.length, 0);
        const matchesWithStreams = groups.reduce((sum, g) => 
          sum + g.matches.filter((m: Match) => m.streamSources && m.streamSources.length > 0).length, 0
        );
        console.log(`[LiveTV] ✅ WeStream: ${totalMatches} matches, ${matchesWithStreams} with streams`);
      }
      
      setLeagueGroups(groups);
      console.log(`[LiveTV] ✅ Loaded ${groups.length} league groups with matches`);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch live TV matches'));
      console.error('Error fetching Live TV matches:', err);
      setLeagueGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches(false);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchMatches(false), 30000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchMatches, autoRefresh]);

  return { leagueGroups, loading, error, refetch: fetchMatches };
};
