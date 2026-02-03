import Image from "next/image";
import type { ReactNode } from "react";

import { SetupUserMenu } from "./_components/setup-user-menu";

export default function SetupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh">
      {/* User menu - top right (on illustration side) */}
      <div className="absolute top-4 right-4 z-10 hidden lg:block">
        <SetupUserMenu />
      </div>

      {/* Left side - Form content */}
      <div className="flex w-full flex-col px-6 py-8 lg:w-1/2 lg:px-16 xl:px-24">
        {/* Logo */}
        <div className="mb-12 flex items-center justify-between">
          <span className="text-xl font-semibold">Clawe</span>
          {/* User menu on mobile */}
          <div className="lg:hidden">
            <SetupUserMenu />
          </div>
        </div>

        {/* Content */}
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Right side - Illustration (hidden on mobile) */}
      <div className="bg-muted relative hidden lg:block lg:w-1/2">
        <div className="absolute inset-0 flex items-end justify-center p-12">
          <Image
            src="/onboarding-hero.png"
            alt="Onboarding illustration"
            width={450}
            height={450}
            className="h-auto max-h-full w-auto max-w-full object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
