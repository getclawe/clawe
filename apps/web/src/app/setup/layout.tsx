"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { SquadhubStatus } from "@/components/squadhub-status";
import { useRedirectIfOnboarded } from "@/hooks/use-onboarding-guard";
import { SetupUserMenu } from "./_components/setup-user-menu";
import {
  SetupRightPanelProvider,
  useSetupRightPanel,
} from "./_components/setup-right-panel";

// Redirects to /board if onboarding is already complete
const OnboardingGuard = () => {
  useRedirectIfOnboarded();
  return null;
};

const RightPanel = () => {
  const { content } = useSetupRightPanel();

  return (
    <div className="bg-muted relative hidden lg:block lg:w-1/2">
      {content ?? (
        <div className="absolute inset-0 flex items-end justify-center p-12">
          <Image
            src="/onboarding-hero.png"
            alt="Onboarding illustration"
            width={450}
            height={450}
            className="h-auto max-h-full w-auto max-w-full object-contain"
            priority
            unoptimized
          />
        </div>
      )}
    </div>
  );
};

export default function SetupLayout({ children }: { children: ReactNode }) {
  return (
    <SetupRightPanelProvider>
      <div className="relative flex h-svh">
        {/* Guard - redirects if already onboarded */}
        <OnboardingGuard />

        {/* User menu and status - top right (on illustration side) */}
        <div className="absolute top-4 right-4 z-10 hidden items-center gap-3 lg:flex">
          <SquadhubStatus />
          <SetupUserMenu />
        </div>

        {/* Left side - Form content */}
        <div className="flex w-full flex-col px-6 py-6 sm:px-8 sm:py-8 lg:w-1/2 lg:px-12 xl:px-16">
          {/* Logo and user menu (mobile) */}
          <div className="mb-8 flex shrink-0 items-center justify-between sm:mb-12">
            <span className="text-xl font-semibold">Clawe</span>
            {/* User menu and status on mobile */}
            <div className="flex items-center gap-3 lg:hidden">
              <SquadhubStatus />
              <SetupUserMenu />
            </div>
          </div>

          {/* Content container - full width for button alignment */}
          <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
        </div>

        {/* Right side - Custom content or default illustration */}
        <RightPanel />
      </div>
    </SetupRightPanelProvider>
  );
}
