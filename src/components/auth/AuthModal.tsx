"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "signup";
  persistent?: boolean; // For login screen that can't be closed
}

export function AuthModal({
  isOpen,
  onClose,
  defaultMode = "login",
  persistent = false,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
  };

  // If persistent, render as a card instead of a modal
  if (persistent) {
    return (
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-2xl p-8 md:p-10">
          {mode === "login" ? (
            <LoginForm onToggleMode={toggleMode} />
          ) : (
            <SignUpForm onToggleMode={toggleMode} />
          )}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <div className="flex justify-center p-4">
          {mode === "login" ? (
            <LoginForm onToggleMode={toggleMode} />
          ) : (
            <SignUpForm onToggleMode={toggleMode} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
