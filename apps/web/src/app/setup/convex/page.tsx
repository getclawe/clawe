"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@clawe/ui/components/button";
import { Input } from "@clawe/ui/components/input";
import { Label } from "@clawe/ui/components/label";
import { Progress } from "@clawe/ui/components/progress";
import { Spinner } from "@clawe/ui/components/spinner";
import { saveConfig } from "@/lib/api/config";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 2;

export default function ConvexSetupPage() {
  const [convexUrl, setConvexUrl] = useState("");

  const mutation = useMutation({
    mutationFn: saveConfig,
    onSuccess: (data) => {
      if (data.ok) {
        // Hard redirect to reinitialize ConvexProvider with new URL
        window.location.href = "/setup/provider";
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(convexUrl);
  };

  const error =
    mutation.error?.message ??
    (mutation.data && !mutation.data.ok ? mutation.data.error : null);

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
          Connect to Convex
        </h1>
        <p className="text-muted-foreground mb-6 sm:mb-8">
          Enter your Convex deployment URL to store your data.
        </p>

        {/* Form fields */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="convex-url">Deployment URL</Label>
            <Input
              id="convex-url"
              type="url"
              placeholder="https://your-project.convex.cloud"
              value={convexUrl}
              onChange={(e) => setConvexUrl(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-sm">
              Find this in your{" "}
              <a
                href="https://dashboard.convex.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Convex dashboard
              </a>{" "}
              under Settings → URL & Deploy Key
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
          disabled={!convexUrl || mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Spinner />
              Connecting...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </form>
  );
}
