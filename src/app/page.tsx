import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

/** Root "/" redirects to login */
export default function RootPage() {
  redirect(ROUTES.LOGIN);
}
