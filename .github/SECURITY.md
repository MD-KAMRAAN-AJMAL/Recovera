# 🔒 Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| main    | ✅ Yes             |

## 🚨 Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Recovera, please report it responsibly by emailing the maintainer directly or using GitHub's [private vulnerability reporting](https://github.com/Priyanshu8023/Recovera/security/advisories/new).

### What to Include

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any proof-of-concept or exploit code (if applicable)
- Your suggested fix (optional but appreciated)

### What to Expect

- **Acknowledgement** within 48 hours
- **Status update** within 7 days
- Credit in the release notes (if desired)

## 🛡️ Security Best Practices for Contributors

- **Never commit secrets**: API keys, tokens, and credentials must never be committed. Use `.env` files (already in `.gitignore`).
- **Encryption**: All sensitive data (AWS credentials, OAuth secrets) is encrypted with AES-256-CBC as per Recovera's design.
- **Dependencies**: Keep dependencies up to date. Run `npm audit` regularly.
- **Input validation**: Always validate and sanitize user inputs in API routes.
- **Policy Engine**: Do not bypass the safety guardrails in `lib/safety/` — they exist to prevent unauthorized AI actions on critical systems.