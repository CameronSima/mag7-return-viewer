import { useState } from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { Dayjs } from "dayjs";
import { DateRangePicker } from "./components/DateRangePicker";
import { ReturnsGrid } from "./components/ReturnsGrid";
import { SummaryTable } from "./components/SummaryTable";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { useReturns } from "./hooks/useReturns";
import { ApiError } from "./api/returns";

/**
 * Root view. Owns the date range state, passes it to the data hook,
 * and routes to the appropriate child component based on query state.
 */
export default function App() {
  const [start, setStart] = useState<Dayjs | null>(null);
  const [end, setEnd] = useState<Dayjs | null>(null);

  const query = useReturns(
    start ? start.format("YYYY-MM-DD") : null,
    end ? end.format("YYYY-MM-DD") : null,
  );

  // Don't show retry on validation errors — the user input is the problem.
  const showRetry =
    query.error instanceof ApiError && query.error.status !== 422;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            MAG7 Returns
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Daily returns for Microsoft, Apple, Alphabet, Amazon, Nvidia, Meta,
            and Tesla. Pick a date range to begin.
          </Typography>
        </Box>

        <DateRangePicker
          start={start}
          end={end}
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />

        {!start || !end ? (
          <Typography variant="body2" color="text.secondary">
            Select a start and end date to load returns.
          </Typography>
        ) : query.isLoading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState
            error={query.error}
            onRetry={showRetry ? () => query.refetch() : undefined}
          />
        ) : query.data ? (
          <Stack spacing={4}>
            <ReturnsGrid data={query.data} />
            <SummaryTable data={query.data} />
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
