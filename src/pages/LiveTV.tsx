import React, { useEffect, useState } from 'react';
import { Tv } from 'lucide-react';
import LeagueSection from '@/components/LeagueSection';
import { getAggregatedLiveMatches } from '@/lib/liveTvAggregator';
import { LeagueGroup } from '@/types/league';

export const LiveTVPage: React.FC = () => {
  const [leagueGroups, setLeagueGroups] = useState<LeagueGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch live matches from Aggregator
  useEffect(() => {
    let isMounted = true;

    const fetchLiveMatches = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[LiveTV] 🔄 Fetching live matches from Aggregator...');
        const groups = await getAggregatedLiveMatches();

        if (!isMounted) return;

        const totalMatches = groups.reduce((sum, g) => sum + g.matches.length, 0);
        const matchesWithStreams = groups.reduce((sum, g) => 
          sum + g.matches.filter(m => m.streamSources && m.streamSources.length > 0).length, 0
        );

        console.log(`[LiveTV] ✅ Got ${totalMatches} live matches`);
        console.log(`[LiveTV] 📊 Grouped into ${groups.length} leagues`);
        console.log(`[LiveTV] 📊 Matches with streams: ${matchesWithStreams}`);

        setLeagueGroups(groups);
      } catch (err) {
        console.error('[LiveTV] ❌ Error fetching live matches:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load live matches');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLiveMatches();

    // Auto-refresh every 60 seconds (relaxed from 30s as we hit multiple APIs)
    const interval = setInterval(() => {
      fetchLiveMatches();
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen p-4 safe-area-top safe-area-x">
      <div className="flex items-center gap-2 sm:gap-3 mb-6">
        <Tv className="text-primary shrink-0 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-xl sm:text-2xl font-bold">Live TV</h1>
      </div>

      <p className="text-muted-foreground mb-6">Watch live matches from multiple sources</p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <p className="text-muted-foreground">Check console for details</p>
        </div>
      ) : leagueGroups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No live matches at the moment
        </div>
      ) : (
        <div className="space-y-4">
          {leagueGroups.map((leagueGroup, index) => (
            <LeagueSection
              key={leagueGroup.league.id}
              leagueGroup={leagueGroup}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveTVPage;
