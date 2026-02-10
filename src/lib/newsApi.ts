
import { Capacitor } from '@capacitor/core';

export interface NewsItem {
  id: string | number;
  title: string;
  image: string;
  original_url: string;
  published_at: string;
  source: {
    id: number | string;
    main_url?: string;
    url?: string;
    title?: string;
  };
}

const API_KEY = 'bffdb88075msh1832f65b5a81519p1ea775jsn5ca875a7973e';
const API_HOST = 'livescore6.p.rapidapi.com';

export const getFootballNews = async (date?: string): Promise<NewsItem[]> => {
  try {
    const response = await fetch(`https://${API_HOST}/news/v3/list?countryCode=US&locale=en&bet=true&competitionIds=65%2C77%2C60&participantIds=2810%2C3340%2C2773`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`News API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse the new API structure
    // Structure seems to be { sect: [ { arts: [...] } ] }
    let articles: any[] = [];
    
    if (data.sect && Array.isArray(data.sect)) {
      for (const section of data.sect) {
        if (section.arts && Array.isArray(section.arts)) {
          articles = [...articles, ...section.arts];
        }
      }
    } else if (data.data && Array.isArray(data.data)) {
        articles = data.data;
    } else if (Array.isArray(data)) {
        articles = data;
    }

    return articles.map((item: any) => ({
      id: item.id || Math.random().toString(),
      title: item.ttl || item.title || 'No Title',
      image: item.tnUrl || item.image || '',
      original_url: item.cnUrl || item.original_url || '',
      published_at: item.pbAt ? new Date(item.pbAt).toISOString() : new Date().toISOString(),
      source: {
        id: item.pId || 0,
        title: item.oTtl || item.source?.title || 'Unknown Source',
        url: '',
        main_url: ''
      }
    }));
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return [];
  }
};
