import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LiveTVDisclaimer from '@/components/Legal/LiveTVDisclaimer';

export const LegalNoticePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-[#159e48] safe-area-top px-4 py-3 flex items-center shadow-lg border-b border-white/10">
        <button
          onClick={() => navigate(-1)}
          className="text-white hover:text-white/80 transition-colors p-2 -ml-2 rounded-full"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-white ml-2">Legal & Content Notice</h1>
      </div>

      <div className="pt-6 pb-2 px-0 sm:px-4">
        {/* Render the compact aggregator notice */}
        <LiveTVDisclaimer compact={true} />
      </div>

      <div className="pb-12">
        {/* Render the full legal notice */}
        <LiveTVDisclaimer compact={false} />
      </div>
    </div>
  );
};

export default LegalNoticePage;
