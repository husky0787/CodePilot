"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApiKeyFormProps {
  onSubmit: (apiKey: string) => void;
  disabled?: boolean;
  error?: string;
}

export function ApiKeyForm({ onSubmit, disabled, error }: ApiKeyFormProps) {
  const [key, setKey] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    const trimmed = key.trim();
    if (!trimmed) {
      setLocalError("Please enter your API key");
      return;
    }
    if (!trimmed.startsWith("sk-ant-")) {
      setLocalError("Invalid format — key must start with sk-ant-");
      return;
    }

    onSubmit(trimmed);
  }

  const displayError = error || localError;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
      <Input
        type="password"
        placeholder="sk-ant-api03-..."
        value={key}
        onChange={(e) => {
          setKey(e.target.value);
          setLocalError(null);
        }}
        disabled={disabled}
        aria-invalid={!!displayError}
        className="h-10 text-sm"
      />

      {displayError && (
        <p className="text-sm text-destructive">{displayError}</p>
      )}

      <Button
        type="submit"
        disabled={disabled || !key.trim()}
        size="lg"
        className="w-full h-10 text-sm font-semibold"
      >
        {disabled ? "Launching..." : "Launch Cloud CodePilot"}
      </Button>
    </form>
  );
}
