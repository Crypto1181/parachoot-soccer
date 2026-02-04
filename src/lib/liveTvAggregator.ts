import { Match } from '@/data/mockData';
import { LeagueGroup } from '@/types/league';
import { StreamSource } from './streamAggregator';
import { getWeStreamLiveMatches, extractWeStreamStreamSources, findMatchingWeStreamMatch, getWeStreamLiveLeagueGroups } from './westreamApi';
import { flashscoreApi } from './flashscoreApi';

// Helper to normalize team names (kept for reference or fallback usage)
function normalizeTeamName(name: string): string {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\s+(fc|cf|united|city|town|rovers|athletic|club|sc|afc|cfc|rfc)$/gi, '')
    .replace(/^(atletico|real|cf|fc|sc|ac)\s+/gi, '')
    .replace(/[^a-z0-9]/g, '');
}

export const getAggregatedLiveMatches = async (): Promise<LeagueGroup[]> => {
  console.log('[LiveTVAggregator] Starting aggregation (FlashScore + WeStream)...');
  
  // 1. Fetch Live Matches from FlashScore (Base Data)
  let groups: LeagueGroup[] = [];
  try {
    groups = await flashscoreApi.getLiveMatchesGrouped();
  } catch (e) {
    console.error('[LiveTVAggregator] FlashScore failed:', e);
    groups = [];
  }

  // 2. Fetch Streams from WeStream
  let westreamMatches: any[] = [];
  try {
    westreamMatches = await getWeStreamLiveMatches(true);
  } catch (e) {
    console.error('[LiveTVAggregator] WeStream failed:', e);
    westreamMatches = [];
  }

  console.log(`[LiveTVAggregator] Fetched: FlashScore Groups(${groups.length}), WeStream(${westreamMatches.length})`);

  // 3. Link Streams to FlashScore Matches
  const linkedWeStreamIds = new Set<string>();
  
  for (const group of groups) {
    if (!group.matches) continue;
    
    for (const match of group.matches) {
       // Try to find matching WeStream match
       // Note: findMatchingWeStreamMatch handles fuzzy matching logic internally
       const matchingWeStreamMatch = findMatchingWeStreamMatch(
         match.homeTeam.name, 
         match.awayTeam.name, 
         westreamMatches
       );

       if (matchingWeStreamMatch) {
         console.log(`[LiveTVAggregator] 🔗 Linked stream for: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
         linkedWeStreamIds.add(matchingWeStreamMatch.id);
         const streams = await extractWeStreamStreamSources(matchingWeStreamMatch);
         if (streams.length > 0) {
           match.streamSources = streams;
           // If match status was not live (e.g. upcoming), force it to live if it has streams
           if (match.status !== 'live') {
             match.status = 'live';
           }
         }
       }
    }
  }

  // 4. Identify and Append Orphaned WeStream Matches (Not in FlashScore)
  // DISABLED: User reported "fake matches" appearing. We now ONLY show matches that are verified by FlashScore.
  // This ensures high data quality and prevents test/spam/incorrect matches from appearing.
  /*
  const orphanedMatches = westreamMatches.filter(wm => !linkedWeStreamIds.has(wm.id));
  console.log(`[LiveTVAggregator] Found ${orphanedMatches.length} orphaned WeStream matches`);

  if (orphanedMatches.length > 0) {
    try {
      const weStreamGroups = await getWeStreamLiveLeagueGroups(true); // use cached if possible
      
      for (const wsGroup of weStreamGroups) {
        // Filter matches in this group that were NOT linked
        const newMatches = wsGroup.matches.filter(m => {
           // We need to check if this match corresponds to a linked ID
           // The match ID from westreamToAppMatch is `westream-${m.id}`
           // So we strip prefix to check
           const rawId = m.id.replace('westream-', '');
           return !linkedWeStreamIds.has(rawId);
        });

        if (newMatches.length > 0) {
          // Check if we already have this league in our groups
          const existingGroup = groups.find(g => 
            (g.league.id === wsGroup.league.id) || 
            (g.league.name === wsGroup.league.name && g.league.country === wsGroup.league.country)
          );

          if (existingGroup) {
             // Append matches to existing group
             console.log(`[LiveTVAggregator] Appending ${newMatches.length} orphaned matches to existing league: ${wsGroup.league.name}`);
             existingGroup.matches.push(...newMatches);
          } else {
             // Add new group
             console.log(`[LiveTVAggregator] Adding new league group for orphans: ${wsGroup.league.name} (${newMatches.length} matches)`);
             groups.push({
               ...wsGroup,
               matches: newMatches
             });
          }
        }
      }
    } catch (e) {
      console.error('[LiveTVAggregator] Failed to process orphaned WeStream matches:', e);
    }
  }
  */

  // 5. Sort groups by priority (Premier League, Champions League, etc.)
  const priorityLeagues = ['premier-league', 'champions-league', 'la-liga', 'bundesliga', 'serie-a', 'ligue-1'];
  
  groups.sort((a, b) => {
      // Safety check for league objects
      if (!a.league || !b.league) return 0;
      
      const aId = a.league.id || '';
      const bId = b.league.id || '';
      
      // Check if ID contains priority strings
      const aIdx = priorityLeagues.findIndex(p => aId.includes(p));
      const bIdx = priorityLeagues.findIndex(p => bId.includes(p));
      
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      
      return (a.league.name || '').localeCompare(b.league.name || '');
  });

  return groups;
};
