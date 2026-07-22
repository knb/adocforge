# Security Policy

## Supported Versions

AdocForge is pre-release software. Security fixes are applied to the latest code on `main`; no released version is currently supported.

## Reporting a Vulnerability

Do not open a public issue or discussion for a suspected vulnerability.

Use GitHub's **Report a vulnerability** action on the repository Security page when available. If private vulnerability reporting is unavailable, contact the repository owner privately through their GitHub profile before sharing technical details.

Include the affected package or commit, reproduction steps, impact, and any known mitigation. Do not access data that is not yours, degrade services, or publish details before a fix is available.

The project will acknowledge a report when it is reviewed and coordinate disclosure based on severity and fix availability.

## Security Boundaries

- AsciiDoc preview HTML must cross an explicit sanitization boundary.
- External includes and content access are disabled unless explicitly enabled.
- AI providers and storage adapters are host-configured.
- API credentials must not be embedded in browser packages or examples.
- Document content must not be sent externally without explicit configuration and user action.
