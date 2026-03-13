"use client";

import { type FormEvent } from "react";
import { Button } from "@/components/ui/button";

interface ApiKeyFormProps {
  onSubmit: (apiKey: string) => void;
  disabled?: boolean;
  error?: string;
}

export function ApiKeyForm({ onSubmit, disabled, error }: ApiKeyFormProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit("");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={disabled}
        size="lg"
        className="w-full h-10 text-sm font-semibold"
      >
        {disabled ? "Launching..." : "Launch Cloud CodePilot"}
      </Button>
    </form>
  );
}
