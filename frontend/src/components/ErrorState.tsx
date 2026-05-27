import { Alert, AlertTitle, Button, Stack } from "@mui/material";

interface ErrorStateProps {
  error: Error;
  // Explicit `| undefined` so callers can pass a conditional handler under
  // exactOptionalPropertyTypes (e.g. onRetry={canRetry ? fn : undefined}).
  onRetry?: (() => void) | undefined;
}

/**
 * Friendly error display. Reads the message off the Error (which for our
 * ApiError includes server-provided detail) and offers a retry button.
 */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Stack spacing={2}>
      <Alert severity="error" variant="outlined">
        <AlertTitle>Unable to load returns</AlertTitle>
        {error.message}
      </Alert>
      {onRetry && (
        <Button
          variant="outlined"
          onClick={onRetry}
          sx={{ alignSelf: "flex-start" }}>
          Try again
        </Button>
      )}
    </Stack>
  );
}
