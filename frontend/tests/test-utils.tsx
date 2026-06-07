import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Render with all the providers the app uses in production. With the shadcn/ui
 * migration the only runtime provider is React Query; styling is plain CSS, so
 * there's no theme provider to wrap. A fresh QueryClient per render keeps tests
 * isolated.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // tests shouldn't retry; failures should be immediate
        gcTime: 0,
      },
    },
  });

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    ...options,
  });
}

// Re-export everything from RTL so tests have one import.
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
