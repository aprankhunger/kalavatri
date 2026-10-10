import supabase from '../db/supabase.js';

export const DEFAULT_SETTINGS = {
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
    description:
      'Handcrafted Punjabi juttis made by master artisans — heritage craft for the modern wardrobe.',
    contactEmail: 'supportkalavatri@gmail.com',
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
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

export const DEFAULT_CATEGORIES = [
  { id: 'bridal', name: 'Bridal', slug: 'bridal', description: 'Heirloom juttis for the big day', image: '/images/jutti_red_bridal.jpg', sortOrder: 1, isActive: true, showOnHome: true },
  { id: 'festive', name: 'Festive', slug: 'festive', description: 'Zardozi and mirror work for celebrations', image: '/images/jutti_maroon_gold.jpg', sortOrder: 2, isActive: true, showOnHome: true },
  { id: 'everyday', name: 'Everyday', slug: 'everyday', description: 'Soft leather comfort for daily wear', image: '/images/jutti_pink_floral.jpg', sortOrder: 3, isActive: true, showOnHome: true },
  { id: 'designer', name: 'Designer', slug: 'designer', description: 'Limited artisan editions', image: '/images/jutti_black_leaf.jpg', sortOrder: 4, isActive: true, showOnHome: true },
];

export const isMissingTableError = (error) =>
  Boolean(error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message || '')));

const mergeSetting = (key, value) => {
  const base = DEFAULT_SETTINGS[key];
  if (Array.isArray(base) || typeof base !== 'object') return value ?? base;
  return { ...base, ...(value || {}) };
};

export const getAllSettings = async () => {
  const result = {};
  SETTING_KEYS.forEach((key) => {
    result[key] = DEFAULT_SETTINGS[key];
  });
  if (!supabase) return result;

  const { data, error } = await supabase.from('site_settings').select('key, value');
  if (error || !data) return result;

  data.forEach((row) => {
    if (SETTING_KEYS.includes(row.key)) result[row.key] = mergeSetting(row.key, row.value);
  });
  return result;
};

export const getSetting = async (key) => {
  const all = await getAllSettings();
  return all[key];
};

export const saveSetting = async (key, value, adminUserId) => {
  if (!supabase) throw new Error('Database is not configured');
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_by: adminUserId || null, updated_at: new Date().toISOString() });
  if (error) {
    if (isMissingTableError(error)) {
      const err = new Error('The site_settings table is missing. Run the database migration from Admin → Store Settings.');
      err.status = 409;
      throw err;
    }
    throw new Error(error.message);
  }
  return mergeSetting(key, value);
};

export const formatCategory = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description || '',
  image: row.image || '',
  sortOrder: row.sort_order ?? 0,
  isActive: row.is_active !== false,
  showOnHome: row.show_on_home !== false,
});

export const getCategories = async ({ includeInactive = false } = {}) => {
  if (!supabase) return DEFAULT_CATEGORIES;
  let query = supabase.from('categories').select('*').order('sort_order', { ascending: true });
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) return DEFAULT_CATEGORIES;
  return data.map(formatCategory);
};
