import { useState, useEffect } from 'react';
import API from '../../services/api';
import { DEFAULT_DURATION } from './constants';

const CACHE_KEY = 'zaplo_splash_config';
const CACHE_TTL = 24 * 60 * 60 * 1000;

export default function useSplashConfig() {
  const [config, setConfig] = useState({
    logoUrl: 'https://res.cloudinary.com/dzu1vvjmo/image/upload/v1785083286/logo1_ckx8a1.png',
    duration: DEFAULT_DURATION,
    primaryColor: '#7C3AED',
    loading: true,
    error: null,
    retryCount: 0,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setConfig(prev => ({
              ...prev,
              logoUrl: data.logo_url || prev.logoUrl,
              duration: data.splash_duration || prev.duration,
              primaryColor: data.primary_color || prev.primaryColor,
              loading: false,
            }));
            fetchFresh();
            return;
          }
        }
        await fetchFresh();
      } catch (err) {
        setConfig(prev => ({ ...prev, loading: false }));
      }
    };

    const fetchFresh = async () => {
      try {
        const res = await API.get('/v1/app-config');
        const data = res.data;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        setConfig(prev => ({
          ...prev,
          logoUrl: data.logo_url || prev.logoUrl,
          duration: data.splash_duration || prev.duration,
          primaryColor: data.primary_color || prev.primaryColor,
          loading: false,
          error: null,
          retryCount: 0,
        }));
      } catch (err) {
        setConfig(prev => {
          const newRetry = prev.retryCount + 1;
          if (newRetry >= 3) return { ...prev, loading: false, error: 'offline' };
          setTimeout(fetchFresh, 1000 * newRetry);
          return { ...prev, retryCount: newRetry };
        });
      }
    };

    fetchConfig();
  }, []);

  return config;
}