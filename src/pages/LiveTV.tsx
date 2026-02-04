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

        // Filter to show ONLY matches with available streams
        const filteredGroups = groups.map(group => ({
          ...group,
          matches: group.matches.filter(m => m.streamSources && m.streamSources.length > 0)
        })).filter(group => group.matches.length > 0);

        const totalMatches = groups.reduce((sum, g) => sum + g.matches.length, 0);
        const matchesWithStreams = filteredGroups.reduce((sum, g) => sum + g.matches.length, 0);

        console.log(`[LiveTV] ✅ Got ${totalMatches} live matches`);
        console.log(`[LiveTV] 📊 Grouped into ${groups.length} leagues`);
        console.log(`[LiveTV] 📊 Matches with streams: ${matchesWithStreams}`);

        setLeagueGroups(filteredGroups);
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
    <div className="min-h-screen">
      {/* Sticky App Bar */}
      <div className="sticky top-0 z-50 bg-[#159e48] safe-area-top px-4 py-3 flex items-center gap-2 shadow-lg border-b border-white/10">
        <Tv className="text-white shrink-0 w-6 h-6" />
        <h1 className="text-lg sm:text-xl font-bold text-white">Live TV</h1>
      </div>

      <div className="pt-4 pb-4 pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
      <p className="text-muted-foreground mb-6 px-2">Watch live matches from multiple sources</p>

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
    </div>
  );
};

export default LiveTVPage;
