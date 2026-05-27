# 🤝 Contributing to Recovera

Thank you for your interest in contributing to **Recovera** — an AI-Assisted SRE Platform for Automated Incident Remediation!

We welcome contributions of all kinds: bug fixes, new features, documentation improvements, and more.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

---

## 🚀 Getting Started

1. **Fork** the repository.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/Recovera.git
   cd Recovera/client
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Set up your environment:**
   ```bash
   cp .env.example .env
   # Fill in the required values
   ```
5. **Run database migrations:**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
6. **Start the development server:**
   ```bash
   npm run dev
   ```

---

## 🛠️ How to Contribute

### Issues

- Before opening a new issue, **search existing issues** to avoid duplicates.
- Use the provided issue templates (Bug Report, Feature Request, Documentation).
- Be as descriptive as possible.

### Pull Requests

- Every PR must be linked to an open issue (use `Fixes #issue-number`).
- PRs should be focused and address a single concern.
- Keep PRs small and reviewable — large PRs take longer to merge.

---

## 🌿 Branch Naming Convention

| Type        | Format                          | Example                        |
|-------------|---------------------------------|--------------------------------|
| Feature     | `feature/<short-description>`   | `feature/rag-code-context`     |
| Bug Fix     | `fix/<short-description>`       | `fix/log-ingestion-crash`      |
| Docs        | `docs/<short-description>`      | `docs/update-architecture`     |
| Refactor    | `refactor/<short-description>`  | `refactor/safety-engine`       |
| Chore       | `chore/<short-description>`     | `chore/update-dependencies`    |

---

## ✍️ Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(scope): <short summary>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Examples:**
```
feat(rca): add Gemini fallback for ambiguous anomalies
fix(ingestion): resolve Firehose batch size overflow
docs(readme): update installation prerequisites
```

---

## ✅ Pull Request Process

1. Ensure your branch is up to date with `main` before submitting.
2. Fill out the **PR template** completely.
3. All CI checks must pass.
4. Your PR will be reviewed by a maintainer — address any requested changes promptly.
5. Once approved, a maintainer will merge your PR.

> ⚠️ **Security:** Never commit API keys, secrets, or credentials. Use `.env` and ensure `.gitignore` is respected.

---

## 🐛 Reporting Bugs

Use the **Bug Report** issue template. Include:
- Steps to reproduce
- Expected vs actual behavior
- Logs, screenshots, or stack traces
- Your environment (Node.js version, OS)

---

## 💡 Suggesting Features

Use the **Feature Request** issue template. Describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives considered

---

## 🙏 Thank You!

Every contribution, no matter how small, makes Recovera better. We appreciate your time and effort!