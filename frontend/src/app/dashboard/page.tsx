// This page should be simple, just rendering the client component
import { DashboardClient } from '@/components/DashboardClient';

export default function DashboardPage() {
  // This server component renders the client component that handles all the logic
  return <DashboardClient />;
}

// Optional: Add a loading UI specific to the dashboard route
// export function Loading() {
//   return <div className="flex items-center justify-center h-screen">Loading Dashboard Data...</div>;
// }