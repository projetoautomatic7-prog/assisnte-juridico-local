import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup após cada teste
afterEach(() => {
  cleanup();
});

// ✅ Polyfill do localStorage para ambiente JSDOM
const localStorageMock = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => { },
  removeItem: (key: string) => { },
  clear: () => { },
  length: 0,
  key: (index: number) => null,
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// ✅ Mock do sessionStorage
Object.defineProperty(globalThis, "sessionStorage", {
  value: localStorageMock,
  writable: true,
});

// Polyfill do window.matchMedia para JSDOM
Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { },
    removeListener: () => { },
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => false,
  }),
});

// Mock do IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserver {
  disconnect() {
    /* Mock method - intentionally empty */
  }
  observe() {
    /* Mock method - intentionally empty */
  }
  takeRecords() {
    return [];
  }
  unobserve() {
    /* Mock method - intentionally empty */
  }
} as unknown as typeof IntersectionObserver;

// Mock do ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  disconnect() {
    /* Mock method - intentionally empty */
  }
  observe() {
    /* Mock method - intentionally empty */
  }
  unobserve() {
    /* Mock method - intentionally empty */
  }
} as unknown as typeof ResizeObserver;

// ✅ NÃO mockar GoogleDocsService globalmente - deixar o service detectar ambiente de teste
// O GoogleDocsService agora detecta automaticamente ambiente de teste via import.meta.env.MODE
// e pula a inicialização real, evitando timeouts
