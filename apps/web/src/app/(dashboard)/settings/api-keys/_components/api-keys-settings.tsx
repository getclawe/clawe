"use client";

import { useState } from "react";
import { useQuery, useMutation as useConvexMutation } from "convex/react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@clawe/backend";
import { Button } from "@clawe/ui/components/button";
import { Input } from "@clawe/ui/components/input";
import { Label } from "@clawe/ui/components/label";
import { Spinner } from "@clawe/ui/components/spinner";
import { Skeleton } from "@clawe/ui/components/skeleton";
import { CheckCircle2, Eye, EyeOff, Pencil } from "lucide-react";
import { toast } from "sonner";
import { patchApiKeys } from "@/lib/squadhub/actions";
import { useApiClient } from "@/hooks/use-api-client";
import { config } from "@/lib/config";

interface KeyRowProps {
  label: string;
  maskedValue?: string;
  required?: boolean;
  placeholder: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  isValid: boolean | null;
  isValidating: boolean;
  validationError?: string;
  onValidate: () => void;
  onSave: () => void;
  isSaving: boolean;
}

const KeyRow = ({
  label,
  maskedValue,
  required,
  placeholder,
  isEditing,
  onEdit,
  onCancel,
  inputValue,
  onInputChange,
  isValid,
  isValidating,
  validationError,
  onValidate,
  onSave,
  isSaving,
}: KeyRowProps) => {
  const [showKey, setShowKey] = useState(false);

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{label}</p>
            {required && !maskedValue && (
              <span className="text-destructive text-xs">Required</span>
            )}
          </div>
          {maskedValue ? (
            <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
              {maskedValue}
            </p>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-xs italic">
              Not configured
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="shrink-0"
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          {maskedValue ? "Update" : "Add"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="flex gap-2">
        <div className="relative max-w-sm flex-1">
          <Input
            type={showKey ? "text" : "password"}
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            className="pr-9"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onValidate}
          disabled={!inputValue || isValidating || isValid === true}
          className="shrink-0"
        >
          {isValidating ? (
            <Spinner />
          ) : isValid === true ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            "Validate"
          )}
        </Button>
      </div>
      {validationError && (
        <p className="text-destructive text-sm">{validationError}</p>
      )}
      {isValid === true && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Key validated
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="brand"
          size="sm"
          onClick={onSave}
          disabled={isValid !== true || isSaving}
        >
          {isSaving ? (
            <>
              <Spinner />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export const ApiKeysSettings = () => {
  const apiKeys = useQuery(api.tenants.getApiKeys, {});
  const setApiKeysMutation = useConvexMutation(api.tenants.setApiKeys);
  const apiClient = useApiClient();

  const [editingAnthropic, setEditingAnthropic] = useState(false);
  const [editingOpenai, setEditingOpenai] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicValid, setAnthropicValid] = useState<boolean | null>(null);
  const [openaiValid, setOpenaiValid] = useState<boolean | null>(null);
  const isCloud = config.isCloud;

  const anthropicValidation = useMutation({
    mutationFn: async (apiKey: string) => {
      const { data } = await apiClient.post<{
        valid: boolean;
        error?: string;
      }>("/api/tenant/validate-key", { provider: "anthropic", apiKey });
      if (!data.valid) throw new Error(data.error || "Invalid API key");
      return data;
    },
    onSuccess: () => setAnthropicValid(true),
    onError: () => setAnthropicValid(false),
  });

  const openaiValidation = useMutation({
    mutationFn: async (apiKey: string) => {
      const { data } = await apiClient.post<{
        valid: boolean;
        error?: string;
      }>("/api/tenant/validate-key", { provider: "openai", apiKey });
      if (!data.valid) throw new Error(data.error || "Invalid API key");
      return data;
    },
    onSuccess: () => setOpenaiValid(true),
    onError: () => setOpenaiValid(false),
  });

  const anthropicSave = useMutation({
    mutationFn: async (key: string) => {
      await setApiKeysMutation({ anthropicApiKey: key });
      await patchApiKeys(key);
      if (isCloud) {
        await apiClient.post("/api/tenant/squadhub/restart");
      }
    },
    onSuccess: () => {
      setEditingAnthropic(false);
      setAnthropicKey("");
      setAnthropicValid(null);
      anthropicValidation.reset();
      toast.success("Anthropic API key saved and applied");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save Anthropic API key");
    },
  });

  const openaiSave = useMutation({
    mutationFn: async (key: string) => {
      await setApiKeysMutation({ openaiApiKey: key });
      await patchApiKeys(undefined, key);
      if (isCloud) {
        await apiClient.post("/api/tenant/squadhub/restart");
      }
    },
    onSuccess: () => {
      setEditingOpenai(false);
      setOpenaiKey("");
      setOpenaiValid(null);
      openaiValidation.reset();
      toast.success("OpenAI API key saved and applied");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save OpenAI API key");
    },
  });

  if (apiKeys === undefined) {
    return <ApiKeysSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">API Keys</h3>
        <p className="text-muted-foreground text-sm">
          Manage the API keys used by your AI agents.
        </p>
      </div>

      <div className="space-y-3">
        <KeyRow
          label="Anthropic"
          maskedValue={apiKeys.anthropicApiKey ?? undefined}
          required
          placeholder="sk-ant-..."
          isEditing={editingAnthropic}
          onEdit={() => setEditingAnthropic(true)}
          onCancel={() => {
            setEditingAnthropic(false);
            setAnthropicKey("");
            setAnthropicValid(null);
            anthropicValidation.reset();
          }}
          inputValue={anthropicKey}
          onInputChange={(value) => {
            setAnthropicKey(value);
            setAnthropicValid(null);
            anthropicValidation.reset();
          }}
          isValid={anthropicValid}
          isValidating={anthropicValidation.isPending}
          validationError={
            anthropicValidation.isError
              ? anthropicValidation.error.message
              : undefined
          }
          onValidate={() => anthropicValidation.mutate(anthropicKey)}
          onSave={() => anthropicSave.mutate(anthropicKey)}
          isSaving={anthropicSave.isPending}
        />

        <KeyRow
          label="OpenAI"
          maskedValue={apiKeys.openaiApiKey ?? undefined}
          placeholder="sk-..."
          isEditing={editingOpenai}
          onEdit={() => setEditingOpenai(true)}
          onCancel={() => {
            setEditingOpenai(false);
            setOpenaiKey("");
            setOpenaiValid(null);
            openaiValidation.reset();
          }}
          inputValue={openaiKey}
          onInputChange={(value) => {
            setOpenaiKey(value);
            setOpenaiValid(null);
            openaiValidation.reset();
          }}
          isValid={openaiValid}
          isValidating={openaiValidation.isPending}
          validationError={
            openaiValidation.isError
              ? openaiValidation.error.message
              : undefined
          }
          onValidate={() => openaiValidation.mutate(openaiKey)}
          onSave={() => openaiSave.mutate(openaiKey)}
          isSaving={openaiSave.isPending}
        />
      </div>
    </div>
  );
};

const ApiKeysSettingsSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-18 w-full rounded-lg" />
        <Skeleton className="h-18 w-full rounded-lg" />
      </div>
    </div>
  );
};
