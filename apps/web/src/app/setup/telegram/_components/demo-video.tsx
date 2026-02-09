"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";

export interface DemoVideoProps {
  onLoaded?: () => void;
}

export const DemoVideo = ({ onLoaded }: DemoVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  return (
    <button
      type="button"
      onClick={togglePlay}
      className="group relative max-h-[95vh] w-auto cursor-pointer"
    >
      <video
        ref={videoRef}
        src="/telegram-demo.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={onLoaded}
        className="max-h-[95vh] w-auto rounded-[2.5rem]"
      />

      {/* Pause/play overlay */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-[2.5rem] transition-opacity",
          paused
            ? "bg-black/30 opacity-100"
            : "opacity-0 group-hover:opacity-100",
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
          {paused ? (
            <Play className="h-6 w-6 pl-0.5" />
          ) : (
            <Pause className="h-6 w-6" />
          )}
        </div>
      </div>
    </button>
  );
};
