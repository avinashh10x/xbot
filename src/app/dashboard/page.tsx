import { Suspense } from "react";
import { DashboardClient } from "./NewDashboard";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
