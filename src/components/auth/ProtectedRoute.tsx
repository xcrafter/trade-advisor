"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "./AuthModal";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "admin" | "user";
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requireRole,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">
                Authentication Required
              </h2>
              <p className="text-gray-600 mb-4">
                Please sign in to access this page
              </p>
            </div>
          </div>
        )}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  // Check role if required
  if (requireRole) {
    const userRole = user.user_metadata?.role || "user";

    if (requireRole === "admin" && userRole !== "admin") {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600">
              You don&apos;t have permission to access this page
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
