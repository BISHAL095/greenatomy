import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import axios from "axios";
import LogsTable from "../src/components/LogsTable";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("LogsTable auth errors", () => {
  beforeEach(() => {
    // Simulate a protected backend route with no valid API token.
    axios.get.mockRejectedValue({ response: { status: 401 } });
  });

  test("shows unauthorized message for protected route", async () => {
    render(
      <LogsTable
        filters={{ method: "", path: "", range: "24h", from: "", to: "", sort: "desc" }}
      />
    );

    expect(
      await screen.findByText("Unauthorized. Set VITE_API_TOKEN to access protected routes.")
    ).toBeInTheDocument();
  });
});
