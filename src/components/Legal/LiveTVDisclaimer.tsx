import React, { useState } from 'react';
import { Shield, Globe, AlertTriangle, ChevronDown, ChevronUp, Mail } from 'lucide-react';

interface LiveTVDisclaimerProps {
  /** If true, shows a compact inline banner. If false, shows full card. */
  compact?: boolean;
}

const LiveTVDisclaimer: React.FC<LiveTVDisclaimerProps> = ({ compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div className="mx-4 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-200 leading-relaxed">
              <span className="font-semibold text-amber-300">Content Aggregator Notice: </span>
              Parachoot Soccer indexes publicly available web streams via the WeStream public API.
              We do not host, store, or rebroadcast any content. Streams are served directly from
              their original sources. Availability is subject to each broadcaster's terms.
            </p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-amber-400 text-xs font-medium hover:text-amber-300 transition-colors"
            >
              {expanded ? 'Show less' : 'Full legal notice'}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {expanded && (
              <div className="mt-3 space-y-2 text-xs text-amber-200/80 leading-relaxed border-t border-amber-500/20 pt-3">
                <p>
                  <span className="font-semibold text-amber-300">No Content Hosted:</span> We serve zero bytes
                  of video or audio from our own servers. All media streams are loaded directly from
                  third-party source servers into a standard in-app browser — identical to how any
                  web browser renders an embedded player.
                </p>
                <p>
                  <span className="font-semibold text-amber-300">Data Sources:</span> Match statistics
                  and discovery data are sourced via a licensed RapidAPI/FlashScore commercial subscription.
                  Live stream links are indexed via the WeStream public API (westream.su), a free and
                  openly available developer API.
                </p>
                <p>
                  <span className="font-semibold text-amber-300">User Responsibility:</span> Users are
                  responsible for ensuring their use of this app complies with applicable local laws and
                  the terms of service of the original content providers.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Mail className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>
                    DMCA / Rights concerns:{' '}
                    <a
                      href="mailto:support@parachootsoccer.com"
                      className="underline text-amber-300"
                    >
                      support@parachootsoccer.com
                    </a>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full card version
  return (
    <div className="mx-4 mb-6 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/30 bg-primary/5">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">Legal & Content Notice</h3>
          <p className="text-xs text-muted-foreground">Content Aggregation Platform</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-4 text-xs text-muted-foreground leading-relaxed">
        
        {/* No Hosting */}
        <div className="flex gap-3">
          <Globe className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground text-xs mb-1">Browser & Aggregator — Not a Content Host</p>
            <p>
              Parachoot Soccer is a sports fan platform that aggregates and indexes publicly
              available web content. We do <strong className="text-foreground">not</strong> host,
              store, cache, transcode, or rebroadcast any video or audio content on our servers.
              All streams are loaded directly from their original source servers via a standard
              in-app WebView browser component.
            </p>
          </div>
        </div>

        {/* Data Sources */}
        <div className="flex gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground text-xs mb-1">Data & Stream Sources</p>
            <ul className="space-y-1">
              <li>
                <span className="text-foreground font-medium">Match Data:</span> Sourced via a
                licensed commercial RapidAPI / FlashScore subscription.
              </li>
              <li>
                <span className="text-foreground font-medium">Live Stream Links:</span> Indexed
                via WeStream (westream.su), a free and publicly available developer API.
                No credentials or licensing required.
              </li>
            </ul>
            <p className="mt-2">
              Availability of third-party content is subject to the original broadcaster's terms.
              Parachoot Soccer does not guarantee the legality, accuracy, or availability of any
              third-party stream in your region.
            </p>
          </div>
        </div>

        {/* User Responsibility */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
          <p className="font-semibold text-foreground text-xs mb-1">⚠️ User Responsibility</p>
          <p>
            By using the Live TV feature, you acknowledge that stream availability and legality
            may vary by country. You are solely responsible for ensuring your use of this app
            complies with applicable local laws and the terms of service of original content
            providers.
          </p>
        </div>

        {/* DMCA */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary text-xs mb-1">DMCA & Rights Holder Contact</p>
            <p>
              If you believe any content indexed by this app infringes your rights, contact us
              immediately with proof of ownership for removal:
            </p>
            <a
              href="mailto:support@parachootsoccer.com"
              className="text-primary font-semibold mt-1 block hover:underline"
            >
              support@parachootsoccer.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTVDisclaimer;
