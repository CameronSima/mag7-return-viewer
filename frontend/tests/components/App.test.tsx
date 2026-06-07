import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
} from "../test-utils";
import { server } from "../mocks/server";
import { sampleCompareResponse } from "../mocks/handlers";
import App from "@/App";

// Plotly needs canvas (absent in jsdom); stub both chart components' library.
vi.mock("react-plotly.js", () => ({
  default: () => <div data-testid="plotly-chart" />,
}));

// The app stores state in the URL; reset it between tests so each starts clean
// and falls back to the default ticker set / date range.
beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("App", () => {
  it("loads and displays a comparison on first paint (default tickers)", async () => {
    renderWithProviders(<App />);

    // The risk/return table and the compared tickers appear once data loads.
    await waitFor(() => {
      expect(screen.getByText("Risk & return")).toBeInTheDocument();
      expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0);
      expect(screen.getAllByText("MSFT").length).toBeGreaterThan(0);
    });

    // The growth chart (mocked) and the common-window caption render.
    expect(screen.getAllByTestId("plotly-chart").length).toBeGreaterThan(0);
    expect(screen.getByText(/common window/i)).toBeInTheDocument();
  });

  it("opens the command palette on ⌘K and runs a command", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);
    await screen.findByText("Risk & return"); // wait for first load

    await user.keyboard("{Meta>}k{/Meta}");
    const input = await screen.findByPlaceholderText(/type a command or search/i);
    expect(input).toBeInTheDocument();

    // Running "Switch to Portfolio" routes to portfolio results.
    await user.click(screen.getByText("Switch to Portfolio"));
    await waitFor(() => {
      expect(screen.getByText("Contribution")).toBeInTheDocument();
    });
  });

  it("surfaces tickers with no data as a warning", async () => {
    server.use(
      http.get("/api/compare", () =>
        HttpResponse.json({
          ...sampleCompareResponse,
          missing: ["FAKE"],
        }),
      ),
    );

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText(/no data for: FAKE/i)).toBeInTheDocument();
    });
  });

  it("switches to portfolio mode and backtests the default holdings", async () => {
    renderWithProviders(<App />);

    // The mode toggle's "Portfolio" is the only such text before results load.
    await userEvent.setup().click(screen.getByText("Portfolio"));

    await waitFor(() => {
      // HoldingsTable is unique to portfolio results.
      expect(screen.getByText("Contribution")).toBeInTheDocument();
      expect(screen.getByText("Risk & return")).toBeInTheDocument();
    });
  });

  it("renders the server error verbatim on 422, without a retry button", async () => {
    server.use(
      http.get("/api/compare", () =>
        HttpResponse.json(
          { detail: "at most 10 tickers may be compared" },
          { status: 422 },
        ),
      ),
    );

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/at most 10 tickers may be compared/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("shows a retry button on server errors and recovers on retry", async () => {
    let callCount = 0;
    server.use(
      http.get("/api/compare", () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json(
            { detail: "upstream price data unavailable" },
            { status: 502 },
          );
        }
        return HttpResponse.json(sampleCompareResponse);
      }),
    );

    renderWithProviders(<App />);

    const retryButton = await screen.findByRole("button", {
      name: /try again/i,
    });
    await userEvent.setup().click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Risk & return")).toBeInTheDocument();
    });
  });
});
