import { redirect } from 'next/navigation';

export default function AddWatchlistRedirect() {
  redirect('/browse');
}
