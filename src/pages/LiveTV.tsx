import React, { useEffect, useState } from 'react';
import { Tv } from 'lucide-react';
import LeagueSection from '@/components/LeagueSection';
import { getAggregatedLiveMatches } from '@/lib/liveTvAggregator';
import { LeagueGroup } from '@/types/league';

import { LocalNotifications } from '@capacitor/local-notifications';

export const LiveTVPage: React.FC = () => {
  const [leagueGroups, setLeagueGroups] = useState<LeagueGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'prompt') {
          await LocalNotifications.requestPermissions();
        }
      } catch (e) {
        console.error('Error initializing notifications:', e);
      }
    };
    initNotifications();
  }, []);

  const [notifiedMatches, setNotifiedMatches] = useState<Set<string>>(new Set());

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

        // Schedule notifications for live matches
        const scheduleNotifications = async () => {
          try {
            const newNotifications = filteredGroups.flatMap(group => 
              group.matches
                .filter(match => !notifiedMatches.has(match.id)) // Only notify if not already notified
                .map(match => ({
                  title: 'Match Live Now!',
                  body: `${match.homeTeam.name} vs ${match.awayTeam.name} is live! Watch now.`,
                  id: parseInt(match.id.replace(/\D/g, '').substring(0, 9)) || Math.floor(Math.random() * 1000000),
                  schedule: { at: new Date(Date.now() + 1000) },
                  extra: { matchId: match.id },
                  smallIcon: 'ic_stat_icon_config_sample', // Default icon, can be customized
                  actionTypeId: '',
                }))
            );

            if (newNotifications.length > 0) {
              await LocalNotifications.schedule({ notifications: newNotifications });
              
              // Update notified set
              setNotifiedMatches(prev => {
                const next = new Set(prev);
                newNotifications.forEach(n => next.add(n.extra?.matchId));
                return next;
              });
              
              console.log(`[LiveTV] 🔔 Scheduled ${newNotifications.length} notifications`);
            }
          } catch (e) {
            console.error('Error scheduling notifications:', e);
          }
        };
        
        scheduleNotifications();
        
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
