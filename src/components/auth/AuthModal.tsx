"use client";

import React from "react";
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
  // If persistent, render as a card instead of a modal
  if (persistent) {
    return (
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-2xl p-8 md:p-10">
          {defaultMode === "login" ? <LoginForm /> : <SignUpForm />}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <div className="flex justify-center p-4">
          {defaultMode === "login" ? <LoginForm /> : <SignUpForm />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
