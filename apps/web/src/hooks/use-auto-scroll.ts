"use client";

import { useRef, useEffect, useCallback, useState } from "react";

export type UseAutoScrollOptions = {
  /** Threshold in pixels to consider "at bottom" */
  threshold?: number;
  /** Whether auto-scroll is enabled */
  enabled?: boolean;
};

export type UseAutoScrollReturn = {
  /** Ref to attach to the ScrollArea root */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Whether the user is currently at the bottom */
  isAtBottom: boolean;
  /** Scroll to bottom programmatically */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  /** Whether to show the scroll-to-bottom button */
  showScrollButton: boolean;
};

/**
 * Get the viewport element from a ScrollArea container.
 * ScrollArea uses data-slot="scroll-area-viewport" for the scrolling element.
 */
function getViewport(container: HTMLElement | null): HTMLElement | null {
  if (!container) return null;
  // For ScrollArea, find the viewport; otherwise use the container itself
  return (
    container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    ) ?? container
  );
}

/**
 * Custom hook for auto-scrolling behavior in message lists.
 * Works with both native scrolling containers and shadcn ScrollArea.
 * Auto-scrolls to bottom when new content is added, unless user has scrolled up.
 */
export function useAutoScroll(
  options: UseAutoScrollOptions = {},
): UseAutoScrollReturn {
  const { threshold = 100, enabled = true } = options;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const userScrolledRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  /**
   * Check if the container is scrolled to bottom.
   */
  const checkIsAtBottom = useCallback(() => {
    const viewport = getViewport(scrollRef.current);
    if (!viewport) return true;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    return scrollHeight - scrollTop - clientHeight <= threshold;
  }, [threshold]);

  /**
   * Scroll to the bottom of the container.
   */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const viewport = getViewport(scrollRef.current);
    if (!viewport) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior,
    });

    userScrolledRef.current = false;
    setIsAtBottom(true);
    setShowScrollButton(false);
  }, []);

  /**
   * Handle scroll events.
   */
  const handleScroll = useCallback(() => {
    const viewport = getViewport(scrollRef.current);
    if (!viewport) return;

    const currentScrollTop = viewport.scrollTop;
    const atBottom = checkIsAtBottom();

    // Detect if user scrolled up
    if (currentScrollTop < lastScrollTopRef.current && !atBottom) {
      userScrolledRef.current = true;
    }

    // Reset user scroll flag when at bottom
    if (atBottom) {
      userScrolledRef.current = false;
    }

    lastScrollTopRef.current = currentScrollTop;
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
  }, [checkIsAtBottom]);

  /**
   * Attach scroll listener.
   */
  useEffect(() => {
    const viewport = getViewport(scrollRef.current);
    if (!viewport) return;

    viewport.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  /**
   * Auto-scroll when content changes (via MutationObserver).
   */
  useEffect(() => {
    if (!enabled) return;

    const viewport = getViewport(scrollRef.current);
    if (!viewport) return;

    const observer = new MutationObserver(() => {
      // Only auto-scroll if user hasn't scrolled up
      if (!userScrolledRef.current && isAtBottom) {
        scrollToBottom("instant");
      }
    });

    observer.observe(viewport, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [enabled, isAtBottom, scrollToBottom]);

  return {
    scrollRef,
    isAtBottom,
    scrollToBottom,
    showScrollButton,
  };
}
