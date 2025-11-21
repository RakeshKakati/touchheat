import { redirect } from 'next/navigation';

// Force dynamic rendering since we use cookies()
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function Home() {
  try {
    // Dynamically import to avoid Edge Runtime issues
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect('/dashboard');
    } else {
      redirect('/login');
    }
  } catch (error) {
    // If Supabase fails, redirect to login
    console.error('Error in root page:', error);
    redirect('/login');
  }
}

