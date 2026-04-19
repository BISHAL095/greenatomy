import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  // Reset DOM state between tests to avoid leaked nodes and assertions.
  cleanup();
});
