import '@testing-library/jest-dom'

// Polyfill for ResizeObserver which is used by Radix UI ScrollArea
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver
