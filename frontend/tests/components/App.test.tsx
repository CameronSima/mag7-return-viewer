import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
  within,
} from "../test-utils";
import { server } from "../mocks/server";
import App from "@/App";

vi.mock("react-plotly.js", () => ({
  default: () => <div data-testid="plotly-chart" />,
}));

// The MUI X DatePicker renders each field as a role="group" whose label
// ("Start date"/"End date") is shared by every MM/DD/YYYY section spinbutton,
// so getByLabelText is ambiguous. Focus the field's first section and paste the
// whole date so the picker fires onChange exactly once with the complete value.
// (Typing digit-by-digit would pass through intermediate valid dates — e.g. the
// year filling 0002 -> 0020 -> 0202 -> 2024 — each triggering its own fetch.)
async function typeDate(
  user: ReturnType<typeof userEvent.setup>,
  fieldName: RegExp,
  date: string,
) {
  const group = screen.getByRole("group", { name: fieldName });
  await user.click(within(group).getAllByRole("spinbutton")[0]);
  await user.paste(date);
}

async function selectDateRange() {
  const user = userEvent.setup();
  await typeDate(user, /start date/i, "01/02/2024");
  await typeDate(user, /end date/i, "01/03/2024");
}

describe("App", () => {
  it("shows a prompt before a date range is selected", () => {
    renderWithProviders(<App />);
    expect(
      screen.getByText(/select a start and end date/i),
    ).toBeInTheDocument();
  });

  it("loads and displays returns after a date range is chosen", async () => {
    renderWithProviders(<App />);
    await selectDateRange();

    await waitFor(() => {
      // Ticker symbols appear once the data is loaded. Each renders in both the
      // ReturnsGrid card and the SummaryTable, so getAllByText (>= 1) is correct.
      expect(screen.getAllByText("MSFT").length).toBeGreaterThan(0);
      expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0);
      expect(screen.getAllByText("TSLA").length).toBeGreaterThan(0);
    });

    // Summary table heading is present.
    expect(screen.getByText("Summary")).toBeInTheDocument();
  });

  it("renders the server error message when the API returns 422", async () => {
    server.use(
      http.get("/api/returns", () =>
        HttpResponse.json(
          { detail: "end date must be on or after start date" },
          { status: 422 },
        ),
      ),
    );

    renderWithProviders(<App />);
    await selectDateRange();

    await waitFor(() => {
      expect(
        screen.getByText(/end date must be on or after start date/i),
      ).toBeInTheDocument();
    });

    // No retry button on validation errors.
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("shows a retry button on server errors and recovers on retry", async () => {
    let callCount = 0;
    server.use(
      http.get("/api/returns", () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json(
            { detail: "upstream price data unavailable" },
            { status: 502 },
          );
        }
        return HttpResponse.json({
          returns: { MSFT: [{ date: "2024-01-02", return: 0.01 }] },
          stats: { MSFT: { min: 0.01, max: 0.01, mean: 0.01, count: 1 } },
        });
      }),
    );

    renderWithProviders(<App />);
    await selectDateRange();

    const retryButton = await screen.findByRole("button", {
      name: /try again/i,
    });
    await userEvent.setup().click(retryButton);

    await waitFor(() => {
      expect(screen.getAllByText("MSFT").length).toBeGreaterThan(0);
    });
  });
});
