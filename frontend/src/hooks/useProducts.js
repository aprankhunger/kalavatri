import useSWR from 'swr';
import { getProducts } from '../services/api';

export const PRODUCTS_KEY = 'products';

// Shared, cached product list. All customer pages (Home, Shop, ProductDetail)
// read through this hook so the catalog is fetched once and reused across
// navigation instead of being re-fetched on every page mount.
export const useProducts = () => {
  const { data, isLoading, error } = useSWR(PRODUCTS_KEY, () => getProducts(), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    shouldRetryOnError: false,
  });
  return { products: data || [], isLoading, error };
};
