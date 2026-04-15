import React from 'react';
import { Shield, Mail, ExternalLink, Copyright } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const CopyrightDisclaimer: React.FC = () => {
  return (
    <Card className="w-full bg-card/50 backdrop-blur-sm border-primary/20">
      <CardHeader className="flex flex-row items-center space-x-2">
        <Shield className="w-5 h-5 text-primary" />
        <CardTitle className="text-lg">Legal & Copyright Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-2">
          <div className="flex items-center space-x-2 text-foreground font-semibold">
            <Copyright className="w-4 h-4" />
            <span>Content Aggregation</span>
          </div>
          <p>
            Parachoot Soccer is a sports fan platform that aggregates match data and indexes publicly available web content. 
            We do not host, store, or upload any video content, media files, or live streams on our own servers.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center space-x-2 text-foreground font-semibold">
            <ExternalLink className="w-4 h-4" />
            <span>External Sources</span>
          </div>
          <p>
            All match statistics and data are sourced via licensed APIs (RapidAPI/FlashScore). 
            Video components are provided as a specialized browser interface for indexing publicly accessible web links. 
            Availability of third-party content is subject to the original broadcaster's terms.
          </p>
        </section>

        <section className="p-3 bg-primary/10 rounded-lg border border-primary/20 space-y-2">
          <div className="flex items-center space-x-2 text-primary font-bold">
            <Mail className="w-4 h-4" />
            <span>DMCA & Takedown Requests</span>
          </div>
          <p className="text-xs">
            We respect intellectual property rights. If you believe your copyrighted content is being indexed 
            without authorization, please contact our legal team with proof of ownership for immediate removal.
          </p>
          <div className="text-foreground font-medium pt-1">
            Parachootsoccer@gmail.com
          </div>
        </section>
      </CardContent>
    </Card>
  );
};

export default CopyrightDisclaimer;
