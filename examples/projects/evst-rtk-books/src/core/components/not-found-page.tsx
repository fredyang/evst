import { Button, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <Stack spacing={3} sx={{ py: 8, alignItems: "center" }}>
      <Typography variant="h4">404: Page not found</Typography>
      <Button component={Link} to="/">
        Back to home
      </Button>
    </Stack>
  );
}
