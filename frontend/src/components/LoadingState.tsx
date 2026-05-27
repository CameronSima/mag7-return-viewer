import { Box, Skeleton, Stack } from "@mui/material";

/**
 * Skeleton placeholder for the returns grid while data is loading.
 * Matches the rough shape of the real grid so layout doesn't shift on load.
 */
export function LoadingState() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rectangular" height={56} />
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={240} />
        ))}
      </Box>
    </Stack>
  );
}
