import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col items-start gap-3">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Unable to load data</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
