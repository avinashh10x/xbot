import { redirect } from 'next/navigation';

export default async function Home() {
  // Redirect directly to dashboard
  redirect('/dashboard');
}

