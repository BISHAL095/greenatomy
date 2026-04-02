import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import axios from "axios";
import App from "../src/App";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

function buildLogs(count = 12) {
  const base = Date.parse("2026-03-30T00:00:00.000Z");
  return Array.from({ length: count }, (_, index) => ({
    id: `log-${index}`,
    method: index % 2 === 0 ? "GET" : "POST",
    path: `/endpoint-${index}`,
    statusCode: 200,
    durationMs: 100 + index,
    cpuUsedMs: 10 + index,
    energyKwh: 0.0001,
    cost: 0.001,
    createdAt: new Date(base + index * 60_000).toISOString(),
  }));
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  axios.get.mockImplementation((url) => {
    if (url.includes("/logs/stats")) {
      return Promise.resolve({
        data: {
          totalRequests: 12,
          avgDurationMs: 123,
          totalEnergyKwh: 0.0012,
          totalCost: 0.02,
          range: "24h",
        },
      });
    }

    if (url.includes("/logs?")) {
      return Promise.resolve({ data: buildLogs(12) });
    }

    return Promise.reject(new Error("Unhandled URL"));
  });
});

describe("Dashboard UI", () => {
  test("shows custom date inputs when custom range is selected", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Logs" }));

    const rangeSelect = screen.getByLabelText("Time range");
    fireEvent.change(rangeSelect, { target: { value: "custom" } });

    expect(await screen.findByLabelText("From")).toBeInTheDocument();
    expect(await screen.findByLabelText("To")).toBeInTheDocument();
  });

  test("applies date sort and supports pagination navigation", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Logs" }));

    expect(await screen.findByText("Showing 10 of 12 logs")).toBeInTheDocument();
    expect(screen.getAllByText("Page 1 of 2").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Date sort"), {
      target: { value: "asc" },
    });

    expect((await screen.findAllByText("Page 1 of 2")).length).toBeGreaterThan(0);

    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("/endpoint-0")).toBeInTheDocument();
  });

  test("syncs page, filters, and chart window to the URL", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Logs" }));
    fireEvent.change(screen.getByLabelText("HTTP method"), {
      target: { value: "get" },
    });
    fireEvent.change(screen.getByLabelText("Request path"), {
      target: { value: "/heavy" },
    });
    fireEvent.change(screen.getByLabelText("Time range"), {
      target: { value: "7d" },
    });
    fireEvent.change(screen.getByLabelText("Date sort"), {
      target: { value: "asc" },
    });

    expect(window.location.search).toContain("page=logs");
    expect(window.location.search).toContain("method=GET");
    expect(window.location.search).toContain("path=%2Fheavy");
    expect(window.location.search).toContain("range=7d");
    expect(window.location.search).toContain("sort=asc");

    fireEvent.click(screen.getByRole("button", { name: "Charts" }));
    expect(await screen.findByLabelText("Window")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Window"), {
      target: { value: "30d" },
    });

    expect(window.location.search).toContain("page=charts");
    expect(window.location.search).toContain("chartRange=30d");
  });

  test("hydrates dashboard state from the URL", async () => {
    window.history.replaceState(
      null,
      "",
      "/?page=logs&method=post&path=%2Fjobs&range=custom&from=2026-03-01T08%3A00&to=2026-03-01T09%3A00&sort=asc&chartRange=24h"
    );

    render(<App />);

    expect(screen.getByRole("button", { name: "Logs" })).toHaveClass("active");
    expect(screen.getByLabelText("HTTP method")).toHaveValue("POST");
    expect(screen.getByLabelText("Request path")).toHaveValue("/jobs");
    expect(screen.getByLabelText("Time range")).toHaveValue("custom");
    expect(await screen.findByLabelText("From")).toHaveValue("2026-03-01T08:00");
    expect(screen.getByLabelText("To")).toHaveValue("2026-03-01T09:00");
    expect(screen.getByLabelText("Date sort")).toHaveValue("asc");

    fireEvent.click(screen.getByRole("button", { name: "Charts" }));
    expect(await screen.findByLabelText("Window")).toHaveValue("24h");
  });
});
