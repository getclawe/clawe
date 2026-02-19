"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Button } from "@clawe/ui/components/button";
import { Progress } from "@clawe/ui/components/progress";
import { Spinner } from "@clawe/ui/components/spinner";
import { CheckCircle2 } from "lucide-react";
import { api } from "@clawe/backend";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 5;

export default function CompletePage() {
  const router = useRouter();
  const completeOnboarding = useMutation(api.accounts.completeOnboarding);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleFinish = async () => {
    setIsCompleting(true);
    try {
      await completeOnboarding({});
      router.push("/board");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setIsCompleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
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

        {/* Success icon */}
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>

        {/* Header */}
        <h1 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          You&apos;re all set!
        </h1>
        <p className="text-muted-foreground">
          Your AI agent is ready to go. You can now manage your tasks and
          communicate with your agent through Telegram.
        </p>
      </div>

      {/* CTA - full width on mobile, right-aligned on larger screens */}
      <div className="flex justify-center pt-6 sm:justify-end sm:pt-8">
        <Button
          variant="brand"
          className="w-full sm:w-auto"
          onClick={handleFinish}
          disabled={isCompleting}
        >
          {isCompleting ? (
            <>
              <Spinner />
              Finishing...
            </>
          ) : (
            "Finish Setup"
          )}
        </Button>
      </div>
    </div>
  );
}
