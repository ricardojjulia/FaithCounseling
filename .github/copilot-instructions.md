This repository requires strict security-first reviews.

When reviewing or changing code, always consider:
- secure coding defects
- PHI exposure
- PII exposure
- secret leakage
- database security
- authn/authz gaps
- logging of sensitive data
- unsafe query construction
- insecure configuration defaults
- encryption and key handling
- privacy-by-design and data minimization

For any meaningful security review task:
1. Review relevant application code, schema, migrations, queries, configuration, and tests.
2. Update:
   - `docs/SecurityChecks/findings.md`
   - `docs/SecurityChecks/recommendations.md`
3. Keep findings and recommendations separate.
4. Use explicit severities and concrete evidence.
5. Prefer strict review standards and flag uncertainty rather than ignoring possible risk.
6. Never state that PHI/PII is handled safely unless the code demonstrates the control.
7. Treat sensitive logging, hardcoded secrets, missing authorization, injection risk, and plaintext sensitive storage as serious issues.
8. When database changes are proposed, consider least privilege, row isolation, constraints, indexes tied to integrity, retention/deletion, and auditability.
9. Do not remove prior findings unless they are confirmed resolved or no longer applicable.
10. Preserve a professional audit tone in the docs.
