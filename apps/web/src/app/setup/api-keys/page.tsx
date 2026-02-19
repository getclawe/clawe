"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation as useConvexMutation } from "convex/react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@clawe/backend";
import { Button } from "@clawe/ui/components/button";
import { Input } from "@clawe/ui/components/input";
import { Label } from "@clawe/ui/components/label";
import { Progress } from "@clawe/ui/components/progress";
import { Spinner } from "@clawe/ui/components/spinner";
import { CheckCircle2 } from "lucide-react";
import { patchApiKeys } from "@/lib/squadhub/actions";
import { useApiClient } from "@/hooks/use-api-client";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 2;

export default function ApiKeysPage() {
  const router = useRouter();
  const apiClient = useApiClient();
  const setApiKeys = useConvexMutation(api.tenants.setApiKeys);

  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicValid, setAnthropicValid] = useState(false);
  const [openaiValid, setOpenaiValid] = useState<boolean | null>(null);

  // Validate Anthropic key
  const anthropicValidation = useMutation({
    mutationFn: async (apiKey: string) => {
      const { data } = await apiClient.post<{ valid: boolean; error?: string }>(
        "/api/tenant/validate-key",
        { provider: "anthropic", apiKey },
      );
      if (!data.valid) {
        throw new Error(data.error || "Invalid API key");
      }
      return data;
    },
    onSuccess: () => {
      setAnthropicValid(true);
    },
    onError: () => {
      setAnthropicValid(false);
    },
  });

  // Validate OpenAI key
  const openaiValidation = useMutation({
    mutationFn: async (apiKey: string) => {
      const { data } = await apiClient.post<{ valid: boolean; error?: string }>(
        "/api/tenant/validate-key",
        { provider: "openai", apiKey },
      );
      if (!data.valid) {
        throw new Error(data.error || "Invalid API key");
      }
      return data;
    },
    onSuccess: () => {
      setOpenaiValid(true);
    },
    onError: () => {
      setOpenaiValid(false);
    },
  });

  // Save keys to Convex and patch into squadhub config
  const saveMutation = useMutation({
    mutationFn: async () => {
      await setApiKeys({
        anthropicApiKey: anthropicKey,
        openaiApiKey: openaiKey || undefined,
      });
      await patchApiKeys(anthropicKey, openaiKey || undefined);
    },
    onSuccess: () => {
      router.push("/setup/business");
    },
  });

  const handleValidateAnthropic = () => {
    if (anthropicKey) {
      anthropicValidation.mutate(anthropicKey);
    }
  };

  const handleValidateOpenai = () => {
    if (openaiKey) {
      openaiValidation.mutate(openaiKey);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (anthropicValid) {
      saveMutation.mutate();
    }
  };

  const isSubmitting = saveMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="max-w-xl flex-1">
        {/* Progress indicator */}
        <div className="mb-6 sm:mb-8">
          <Progress
            value={(CURRENT_STEP / TOTAL_STEPS) * 100}
            className="h-1 w-full max-w-sm"
            indicatorClassName="bg-brand"
          />
        </div>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          API Keys
        </h1>
        <p className="text-muted-foreground mb-6">
          Your AI agents need API keys to connect to language models. Keys are
          stored securely and never leave your deployment.
        </p>

        <div className="space-y-6">
          {/* Anthropic API Key (required) */}
          <div className="space-y-2">
            <Label htmlFor="anthropic-key">
              Anthropic API Key <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="anthropic-key"
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => {
                  setAnthropicKey(e.target.value);
                  setAnthropicValid(false);
                  anthropicValidation.reset();
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleValidateAnthropic}
                disabled={
                  !anthropicKey ||
                  anthropicValidation.isPending ||
                  anthropicValid
                }
                className="shrink-0"
              >
                {anthropicValidation.isPending ? (
                  <Spinner />
                ) : anthropicValid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  "Validate"
                )}
              </Button>
            </div>
            {anthropicValidation.isError && (
              <p className="text-destructive text-sm">
                {anthropicValidation.error.message}
              </p>
            )}
            {anthropicValid && (
              <p className="text-sm text-green-600 dark:text-green-400">
                API key is valid
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Get your key from{" "}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2"
              >
                console.anthropic.com
              </a>
            </p>
          </div>

          {/* OpenAI API Key (optional) */}
          <div className="space-y-2">
            <Label htmlFor="openai-key">
              OpenAI API Key{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (optional)
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => {
                  setOpenaiKey(e.target.value);
                  setOpenaiValid(null);
                  openaiValidation.reset();
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleValidateOpenai}
                disabled={
                  !openaiKey ||
                  openaiValidation.isPending ||
                  openaiValid === true
                }
                className="shrink-0"
              >
                {openaiValidation.isPending ? (
                  <Spinner />
                ) : openaiValid === true ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  "Validate"
                )}
              </Button>
            </div>
            {openaiValidation.isError && (
              <p className="text-destructive text-sm">
                {openaiValidation.error.message}
              </p>
            )}
            {openaiValid === true && (
              <p className="text-sm text-green-600 dark:text-green-400">
                API key is valid
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Enables image generation. You can add this later in Settings.
            </p>
          </div>
        </div>

        {saveMutation.isError && (
          <p className="text-destructive mt-4 text-sm">
            {saveMutation.error.message}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="flex justify-center pt-6 sm:justify-end sm:pt-8">
        <Button
          type="submit"
          variant="brand"
          className="w-full sm:w-auto"
          disabled={!anthropicValid || isSubmitting}
        >
          {isSubmitting ? (
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
