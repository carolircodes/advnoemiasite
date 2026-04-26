# Security Rotation Notes

## 2026-04-26 - Local validation cookies removed from Git tracking

Two local browser validation cookie files were found in Git tracking under
`apps/portal-backend/` and were removed from the index without deleting the
local copies.

Treat any cookie/session material previously committed in those files as
exposed. Rotate or invalidate the corresponding sessions in the identity
provider/admin console before relying on the environment for production-like
validation.

Do not commit cookie jars, exported headers, response dumps, provider tokens,
or browser automation artifacts. Keep them local and short-lived.
