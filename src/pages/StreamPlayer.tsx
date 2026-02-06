import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, AlertCircle } from 'lucide-react';
import { getStreamEmbedUrl, getStreamInfo } from '@/lib/westreamApi';
import { getStreamUrl, StreamSource } from '@/lib/streamAggregator';
import { useMatch } from '@/hooks/useMatches';
import TeamLogo from '@/components/TeamLogo';
import { Match } from '@/data/mockData';

export const StreamPlayerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { matchId, provider, source, streamId } = useParams<{ matchId: string; provider?: string; source: string; streamId: string }>();

  // Get initial match from navigation state if available
  const initialMatch = location.state?.match as Match | undefined;

  // Use state to manage the displayed match data
  const [match, setMatch] = useState<Match | null>(initialMatch || null);

  const { match: fetchedMatch, loading: matchLoading } = useMatch(matchId || '');

  // Update match data when fetchedMatch changes
  useEffect(() => {
    if (fetchedMatch) {
      setMatch(prevMatch => {
        // If we have no previous match, just use the fetched one
        if (!prevMatch) return fetchedMatch;
        
        // If it's the same match, preserve the higher score to prevent 0-0 glitches (stale API data)
        if (prevMatch.id === fetchedMatch.id) {
          const currentHome = prevMatch.homeScore ?? 0;
          const currentAway = prevMatch.awayScore ?? 0;
          const fetchedHome = fetchedMatch.homeScore ?? 0;
          const fetchedAway = fetchedMatch.awayScore ?? 0;

          return {
            ...fetchedMatch,
            // Keep the higher score - prevents 1-1 turning into 0-0 due to API lag
            homeScore: Math.max(currentHome, fetchedHome),
            awayScore: Math.max(currentAway, fetchedAway)
          };
        }
        
        return fetchedMatch;
      });
    }
  }, [fetchedMatch]);

  const isLoading = !match && matchLoading;

  const [streamLoading, setStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamNo, setStreamNo] = useState(1);
  const [availableStreams, setAvailableStreams] = useState<number[]>([]);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  
  // Build stream source object - handle both old and new route formats
  // If provider is missing but source exists, check if it looks like a provider or source
  let actualProvider = provider || 'westream';
  let actualSource = source || '';
  
  // Handle old route format where provider was missing
  if (!provider && source) {
    // If source matches known provider names, use it as provider
    if (source === 'westream' || source === 'streamed') {
      actualProvider = source;
      // streamId would actually be the source in old format
      actualSource = streamId || '';
    }
  }
  
  const streamSource: StreamSource = { 
    source: actualSource, 
    id: streamId || '',
    provider: actualProvider
  };

  // Load stream URL and info
  useEffect(() => {
    if (!source || !streamId) {
      setStreamLoading(false);
      setStreamError('Stream source not found');
      return;
    }

    const loadStreamData = async () => {
      try {
        setStreamLoading(true);
        setStreamError(null);

        console.log(`[StreamPlayer] Loading stream for provider: ${streamSource.provider}, source: ${streamSource.source}, id: ${streamSource.id}`);
        
        // Load stream URL based on provider
        const url = await getStreamUrl(streamSource, streamNo);
        console.log(`[StreamPlayer] Got stream URL: ${url.substring(0, 100)}...`);
        setEmbedUrl(url);

        // Try to get stream info for WeStream (to find available stream numbers)
        if (streamSource.provider === 'westream') {
          try {
            const info = await getStreamInfo(source, streamId);
            if (info.streams && Array.isArray(info.streams)) {
              setAvailableStreams(info.streams);
            } else {
              setAvailableStreams([1]);
            }
          } catch (error) {
            // Default to stream 1 if info fetch fails
            setAvailableStreams([1]);
          }
        } else if (streamSource.provider === 'streamed') {
          // Streamed.pk typically provides embed URLs directly
          setAvailableStreams([1]);
          console.log(`[StreamPlayer] Streamed.pk stream loaded: ${url.substring(0, 80)}...`);
        } else {
          // For other providers, default to stream 1
          setAvailableStreams([1]);
        }

        setStreamLoading(false);
      } catch (error) {
        console.error('[StreamPlayer] Error loading stream:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load stream';
        setStreamError(errorMessage);
        setStreamLoading(false);
      }
    };

    loadStreamData();
  }, [source, streamId, streamNo, provider]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Match not found</h2>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!source || !streamId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Stream not available</h2>
          <p className="text-muted-foreground mb-4">No streaming source found for this match</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-black/90 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-800 safe-area-top">
        <div className="flex items-center justify-between p-3 sm:p-4 safe-area-x">
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:text-primary transition-colors shrink-0 p-2 -ml-2 rounded-full active:bg-white/10"
            aria-label="Go back"
          >
            <ArrowLeft size={24} className="sm:w-6 sm:h-6" />
          </button>
          <div className="flex-1 text-center min-w-0 px-2">
            <h1 className="text-white font-bold text-base sm:text-lg truncate">Live Stream</h1>
            <p className="text-gray-400 text-xs sm:text-sm truncate">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </p>
          </div>
          <div className="w-5 sm:w-6 shrink-0" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Match Info Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 sm:px-4 py-2 sm:py-3 safe-area-x">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white p-1 shrink-0">
              <TeamLogo team={match.homeTeam} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-xs sm:text-sm truncate">{match.homeTeam.name}</p>
            </div>
            {/* 
            <div className="text-white font-bold text-base sm:text-lg whitespace-nowrap shrink-0">
              {match.homeScore} - {match.awayScore}
            </div>
            */}
            <div className="flex-1 text-right min-w-0">
              <p className="text-white font-semibold text-xs sm:text-sm truncate">{match.awayTeam.name}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white p-1 shrink-0">
              <TeamLogo team={match.awayTeam} size="sm" />
            </div>
          </div>
        </div>
        {match.status === 'live' && match.minute && (
          <div className="mt-2 text-center">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              LIVE {match.minute}'
            </span>
          </div>
        )}
      </div>

      {/* Stream Player */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 aspect ratio */}
        {streamLoading ? (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
              <p className="text-white">Loading stream...</p>
            </div>
          </div>
        ) : streamError ? (
          <div className="absolute inset-0 bg-black flex items-center justify-center p-4">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-white mb-2">{streamError}</p>
              <div className="text-gray-400 text-sm mb-4 max-w-md">
                <p>If you see "No match" inside the player, the stream might be offline or blocked by the provider.</p>
                <p className="mt-1">Try refreshing the source or using a different stream if available.</p>
              </div>
              <button
                onClick={() => {
                  setStreamError(null);
                  setStreamLoading(true);
                  // Retry loading
                  window.location.reload();
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg mt-4"
              >
                Retry
              </button>
            </div>
          </div>
        ) : embedUrl ? (
          // Check if URL is an iframe embed code or direct URL
          embedUrl.trim().startsWith('<iframe') ? (
            // If it's an iframe tag, extract src and use it, or render the HTML directly
            <div 
              className="absolute top-0 left-0 w-full h-full"
              dangerouslySetInnerHTML={{ __html: embedUrl }}
            />
          ) : (
            <iframe
              src={embedUrl}
              className="absolute top-0 left-0 w-full h-full"
              allowFullScreen
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="origin-when-cross-origin"
              onLoad={() => {
                console.log('[StreamPlayer] Iframe loaded successfully');
                setStreamLoading(false);
              }}
              onError={(e) => {
                console.error('[StreamPlayer] Iframe load error:', e);
                setStreamError('Failed to load stream');
                setStreamLoading(false);
              }}
            />
          )
        ) : (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
              <p className="text-white">Loading stream URL...</p>
            </div>
          </div>
        )}
      </div>

      {/* Stream Options */}
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white text-sm font-semibold">Available Streams</p>
          <button 
            onClick={() => {
              clearWeStreamCache();
              window.location.reload();
            }}
            className="text-xs text-primary hover:text-primary/80 underline"
          >
            Refresh Source
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {availableStreams.map((num) => (
            <button
              key={num}
              onClick={() => {
                setStreamNo(num);
                setStreamLoading(true);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                streamNo === num
                  ? 'bg-primary text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Stream {num}
            </button>
          ))}
        </div>
      </div>

      {/* Match Details */}
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="space-y-2 text-sm">
          {match.competition && (
            <div className="flex items-center gap-2 text-gray-400">
              <span className="font-semibold text-gray-300">Competition:</span>
              <span>{match.competition}</span>
            </div>
          )}
          {match.venue && (
            <div className="flex items-center gap-2 text-gray-400">
              <span className="font-semibold text-gray-300">Venue:</span>
              <span>{match.venue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreamPlayerPage;
