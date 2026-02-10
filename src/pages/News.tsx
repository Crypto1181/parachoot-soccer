
import React, { useState, useEffect } from 'react';
import { getFootballNews, NewsItem } from '@/lib/newsApi';
import { format } from 'date-fns';
import { ExternalLink, Loader2, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const NewsPage = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await getFootballNews();
      setNews(data);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 pt-16 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-primary" />
          Latest Football News
        </h1>
      </div>

      {/* News Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading latest news...</p>
        </div>
      ) : news.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow bg-card border-border group">
              <div className="aspect-video w-full overflow-hidden bg-muted relative">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1a1a1a/ffffff?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-secondary text-muted-foreground">
                    <Newspaper className="h-10 w-10 opacity-20" />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                  {item.source?.title || 'News'}
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-xs text-muted-foreground">
                      {format(new Date(item.published_at), 'MMM d, h:mm a')}
                   </span>
                </div>
                
                <h3 className="font-semibold text-card-foreground line-clamp-2 mb-3 leading-tight">
                  {item.title}
                </h3>
                
                <Button 
                  className="w-full mt-2 gap-2" 
                  variant="outline"
                  onClick={() => window.open(item.original_url, '_blank')}
                >
                  Read Full Story
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border border-border/50">
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No news found</h3>
          <p className="text-muted-foreground mt-1">
            Try checking a different date.
          </p>
          <Button 
            variant="link" 
            onClick={() => setCurrentDate(new Date())}
            className="mt-4"
          >
            Go to Today
          </Button>
        </div>
      )}
    </div>
  );
};

export default NewsPage;
