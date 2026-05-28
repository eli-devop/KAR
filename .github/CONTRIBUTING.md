# Contributing to KAR

Thank you for your interest in contributing to **KAR — U.S. Labor Market AI Agent**! 🎉

We welcome contributions of all kinds: bug fixes, new features, documentation improvements, tests, and more.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [How to Contribute](#how-to-contribute)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before participating. We are committed to providing a welcoming and inclusive environment for everyone.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.0+ or Node.js 20+
- A [Supabase](https://supabase.com) project (for backend features)
- Git

### Setup

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/KAR.git
cd KAR

# 3. Add the upstream remote
git remote add upstream https://github.com/eli-devop/KAR.git

# 4. Install dependencies
bun install

# 5. Copy environment variables
cp .env.example .env
# Fill in your Supabase credentials

# 6. Start the dev server
bun dev
```

---

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feat/add-occupation-comparison` — new features
- `fix/bls-api-timeout` — bug fixes
- `docs/update-readme` — documentation changes
- `refactor/forecast-functions` — code refactoring
- `chore/bump-deps` — maintenance tasks

### Keeping Your Fork in Sync

```bash
git fetch upstream
git checkout master
git merge upstream/master
```

---

## How to Contribute

### 1. Find an Issue

- Look for issues labelled **good first issue** or **help wanted**
- Comment on the issue to let others know you're working on it
- Or open a new issue to discuss your idea before coding

### 2. Make Your Changes

- Write clean, well-documented code
- Add or update tests where applicable
- Update documentation if you change behaviour
- Keep commits small and focused

### 3. Open a Pull Request

- Push your branch to your fork
- Open a PR against `master`
- Fill in the PR template completely
- Link the related issue with `Closes #123`

---

## Pull Request Guidelines

- **One feature per PR** — keep changes focused
- **Descriptive titles** — e.g. `feat: add CSV export for occupation scores`
- **Tests pass** — all CI checks must be green
- **No sensitive data** — never commit API keys, .env files, or credentials
- **Clean commits** — squash WIP commits before requesting review

---

## Coding Standards

```bash
# Lint your code
bun run lint

# Format with Prettier
bun run format

# Type-check
bunx tsc --noEmit

# Run the dev server to test manually
bun dev
```

### Style Guidelines

- Use **TypeScript** for all new code — avoid `any` types
- Follow existing patterns in `src/` for components and hooks
- Use **Tailwind CSS** for styling — avoid inline styles
- Prefer **named exports** over default exports for components
- Write **descriptive variable names** — clarity over brevity

---

## Reporting Bugs

1. Search [existing issues](https://github.com/eli-devop/KAR/issues) to avoid duplicates
2. Open a new issue with the **Bug Report** template
3. Include: steps to reproduce, expected vs. actual behaviour, screenshots if applicable, environment info (OS, browser, Bun/Node version)

---

## Requesting Features

1. Search [existing issues](https://github.com/eli-devop/KAR/issues) for similar requests
2. Open a new issue with the **Feature Request** template
3. Describe the problem you're solving, not just the solution
4. Consider the scope — is this broadly useful or very specific?

---

## Questions?

Feel free to open a [Discussion](https://github.com/eli-devop/KAR/discussions) for questions, ideas, or anything that doesn't fit an issue.

Thank you for contributing! Together we can build the best open-source labor market intelligence platform. 🚀
