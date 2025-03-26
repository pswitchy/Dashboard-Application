// src/app/page.tsx
'use client'; // This page needs client-side hooks for auth check

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Optional: Use a loading spinner

export default function HomePage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication status is determined
    if (!authLoading) {
      if (isAuthenticated) {
        // If logged in, redirect to the dashboard
        console.log('HomePage Effect: User authenticated, redirecting to /dashboard');
        router.replace('/dashboard'); // Use replace to avoid adding '/' to browser history
      } else {
        // If not logged in, redirect to the login page
        console.log('HomePage Effect: User not authenticated, redirecting to /login');
        router.replace('/login');
      }
    }
  }, [isAuthenticated, authLoading, router]);

  // Display a loading indicator while checking auth status
  // This page should ideally only be visible very briefly
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Loading application...</p>
    </div>
  );
}