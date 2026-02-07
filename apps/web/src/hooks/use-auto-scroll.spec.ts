import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoScroll } from "./use-auto-scroll";

// Mock scrollTo
const mockScrollTo = vi.fn();

describe("useAutoScroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScrollTo.mockClear();
  });

  describe("initial state", () => {
    it("returns correct initial values", () => {
      const { result } = renderHook(() => useAutoScroll());

      expect(result.current.scrollRef.current).toBeNull();
      expect(result.current.isAtBottom).toBe(true);
      expect(result.current.showScrollButton).toBe(false);
      expect(typeof result.current.scrollToBottom).toBe("function");
    });
  });

  describe("scrollToBottom", () => {
    it("calls scrollTo with smooth behavior by default", () => {
      const { result } = renderHook(() => useAutoScroll());

      // Create a mock element
      const mockElement = {
        scrollTo: mockScrollTo,
        scrollHeight: 1000,
        scrollTop: 0,
        clientHeight: 500,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      // @ts-expect-error - assigning mock to ref
      result.current.scrollRef.current = mockElement;

      act(() => {
        result.current.scrollToBottom();
      });

      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 1000,
        behavior: "smooth",
      });
    });

    it("accepts custom behavior parameter", () => {
      const { result } = renderHook(() => useAutoScroll());

      const mockElement = {
        scrollTo: mockScrollTo,
        scrollHeight: 1000,
        scrollTop: 0,
        clientHeight: 500,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      // @ts-expect-error - assigning mock to ref
      result.current.scrollRef.current = mockElement;

      act(() => {
        result.current.scrollToBottom("instant");
      });

      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 1000,
        behavior: "instant",
      });
    });
  });

  describe("options", () => {
    it("accepts custom threshold", () => {
      const { result } = renderHook(() => useAutoScroll({ threshold: 50 }));

      expect(result.current.isAtBottom).toBe(true);
    });

    it("can be disabled", () => {
      const { result } = renderHook(() => useAutoScroll({ enabled: false }));

      expect(result.current.isAtBottom).toBe(true);
    });
  });
});
