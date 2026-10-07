import useSWR from 'swr';
import adminApi from '../services/adminApi';

const fetcher = (url) => adminApi.get(url).then((r) => r.data?.categories || []);

export default function useAdminCategories() {
  const { data } = useSWR('/categories', fetcher, { revalidateOnFocus: false });
  return data || [];
}
