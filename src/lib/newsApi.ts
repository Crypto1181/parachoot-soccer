
import { Capacitor } from '@capacitor/core';

export interface NewsItem {
  id: number;
  title: string;
  image: string;
  original_url: string;
  published_at: string;
  source: {
    id: number;
    main_url: string;
    url?: string;
    title?: string;
  };
}

const API_KEY = 'bffdb88075msh1832f65b5a81519p1ea775jsn5ca875a7973e';
const API_HOST = 'football-news11.p.rapidapi.com';

export const getFootballNews = async (date: string): Promise<NewsItem[]> => {
  try {
    // If running on device, we might need to handle CORS or use a native HTTP plugin
    // But for now we'll use fetch and see. RapidAPI usually allows CORS or we might need a proxy.
    // Given the environment, we'll try direct fetch.
    
    const response = await fetch(`https://${API_HOST}/api/news-by-date?date=${date}&lang=en&page=1`, {
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
    
    // The API seems to return an array directly based on my test (it ended with ]})
    // But let's handle if it's { result: [] } or just []
    if (Array.isArray(data)) {
      return data;
    } else if (data.result && Array.isArray(data.result)) {
      return data.result;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return [];
  }
};
