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
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      {/* Content - constrained width */}
      <div className="max-w-xl flex-1">
        {/* Progress indicator */}
        <div className="mb-8 sm:mb-12">
          <Progress
            value={(CURRENT_STEP / TOTAL_STEPS) * 100}
            className="h-1 w-full max-w-sm"
            indicatorClassName="bg-brand"
          />
        </div>

        {/* Header */}
        <h1 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Connect Anthropic
        </h1>
        <p className="text-muted-foreground mb-6 sm:mb-8">
          Enter your API key to power your AI agent.
        </p>

        {/* Form fields */}
        <div className="space-y-6">
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
        </div>
      </div>

      {/* CTA - full width on mobile, right-aligned on larger screens */}
      <div className="flex justify-center pt-6 sm:justify-end sm:pt-8">
        <Button
          type="submit"
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
      </div>
    </form>
  );
}
