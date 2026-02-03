"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@clawe/ui/components/button";
import { Input } from "@clawe/ui/components/input";
import { Label } from "@clawe/ui/components/label";
import { Progress } from "@clawe/ui/components/progress";
import { Spinner } from "@clawe/ui/components/spinner";
import { saveAnthropicApiKey } from "@/lib/openclaw/actions";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 3;

export default function ProviderPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");

  const mutation = useMutation({
    mutationFn: saveAnthropicApiKey,
    onSuccess: (data) => {
      if (data.ok) {
        router.push("/setup/telegram");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(apiKey);
  };

  const error =
    mutation.error?.message ??
    (mutation.data && !mutation.data.ok ? mutation.data.error.message : null);

  return (
    <div className="flex flex-col">
      {/* Progress indicator */}
      <div className="mb-12">
        <Progress
          value={(CURRENT_STEP / TOTAL_STEPS) * 100}
          className="h-1 w-64"
          indicatorClassName="bg-brand"
        />
      </div>

      {/* Header */}
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">
        Connect Anthropic
      </h1>
      <p className="text-muted-foreground mb-8">
        Enter your API key to power your AI agent.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
          <p className="text-muted-foreground text-sm">
            Get your key at{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              console.anthropic.com
            </a>
          </p>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button
          type="submit"
          size="lg"
          variant="brand"
          className="w-full sm:w-auto"
          disabled={!apiKey || mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Spinner />
              Saving...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    </div>
  );
}
