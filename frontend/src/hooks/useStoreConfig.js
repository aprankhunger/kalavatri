import useSWR from 'swr';
import { getStoreConfig } from '../services/api';

export const DEFAULT_STORE_CONFIG = {
  announcement: {
    enabled: true,
    text: 'Sign up and get 20% off your first order with code FIRST20.',
    linkLabel: 'Shop Now',
    linkUrl: '/shop',
    backgroundColor: '#731F26',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  navigation: {
    links: [
      { label: 'Shop', url: '/shop' },
      { label: 'Bridal', url: '/shop?category=bridal' },
      { label: 'New Arrivals', url: '/shop?sort=newest' },
      { label: 'On Sale', url: '/shop?badge=sale' },
    ],
  },
  hero: {
    title: 'FIND JUTTIS THAT MATCHES YOUR STYLE',
    subtitle:
      'Browse through our diverse range of meticulously crafted leather juttis, designed to bring out your individuality and cater to your sense of style.',
    ctaLabel: 'Shop Now',
    ctaUrl: '/shop',
    image: '/images/hero_banner.jpg',
    stats: [
      { value: '50+', label: 'Artisan Designs' },
      { value: '2,000+', label: 'Pairs Handcrafted' },
      { value: '30,000+', label: 'Happy Customers' },
    ],
  },
  footer: {
    description: 'Handcrafted Punjabi juttis made by master artisans — heritage craft for the modern wardrobe.',
    contactEmail: 'support@kalavatri.com',
    contactPhone: '',
    instagramUrl: '',
    facebookUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
  },
  store: {
    deliveryFee: 0,
    freeShippingThreshold: 0,
    dispatchNote: 'Orders are handcrafted with care and dispatched within 2–4 business days via insured courier.',
    maxQuantityPerItem: 10,
  },
  homepage: {
    newArrivalsTitle: 'NEW ARRIVALS',
    topSellingTitle: 'TOP SELLING',
    categoriesTitle: 'BROWSE BY OCCASION',
    testimonialsTitle: 'OUR HAPPY CUSTOMERS',
    showCategories: true,
    showTestimonials: true,
  },
  categories: [
    { slug: 'bridal', name: 'Bridal', image: '/images/jutti_red_bridal.jpg', showOnHome: true },
    { slug: 'festive', name: 'Festive', image: '/images/jutti_maroon_gold.jpg', showOnHome: true },
    { slug: 'everyday', name: 'Everyday', image: '/images/jutti_pink_floral.jpg', showOnHome: true },
    { slug: 'designer', name: 'Designer', image: '/images/jutti_black_leaf.jpg', showOnHome: true },
  ],
};

const mergeConfig = (remote) => {
  if (!remote) return DEFAULT_STORE_CONFIG;
  const merged = { ...DEFAULT_STORE_CONFIG };
  for (const key of Object.keys(DEFAULT_STORE_CONFIG)) {
    if (key === 'categories') {
      merged.categories = Array.isArray(remote.categories) && remote.categories.length ? remote.categories : DEFAULT_STORE_CONFIG.categories;
    } else if (remote[key]) {
      merged[key] = { ...DEFAULT_STORE_CONFIG[key], ...remote[key] };
    }
  }
  return merged;
};

export const STORE_CONFIG_KEY = 'store-config';

export const useStoreConfig = () => {
  const { data, isLoading } = useSWR(STORE_CONFIG_KEY, getStoreConfig, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    shouldRetryOnError: false,
  });
  return { config: mergeConfig(data), isLoading };
};

export const calculateDeliveryFee = (store, subtotal) => {
  const fee = Number(store?.deliveryFee || 0);
  const threshold = Number(store?.freeShippingThreshold || 0);
  if (fee <= 0) return 0;
  if (threshold > 0 && subtotal >= threshold) return 0;
  return fee;
};

export const isExternalUrl = (url = '') => /^https?:\/\//i.test(url);
