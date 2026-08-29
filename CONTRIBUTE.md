# Contributing to GradeIT

Welcome to the GradeIT project! We're excited that you're interested in contributing to our automated coding evaluation platform. This guide will help you get started with development and outline our contribution process.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Security Vulnerabilities](#security-vulnerabilities)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors are expected to:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them get started
- Focus on constructive criticism and avoid personal attacks
- Respect differing viewpoints and experiences
- Accept responsibility for mistakes and learn from them

## Development Environment Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher (v22 recommended for Alpine compatibility)
- **pnpm/npm**: Latest version
- **PostgreSQL**: v13 or higher (local or cloud instance)
- **Git**: v2.0 or higher
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Prisma

### Initial Setup

1. **Fork and Clone the Repository**

   ```bash
   # Fork on GitHub first, then:
   git clone https://github.com/<your-username>/GradeIt.git
   cd GradeIt

   # Add upstream remote
   git remote add upstream https://github.com/Habeel-Shamsudeen/GradeIt.git
   ```

2. **Install Dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment Configuration**

   ```bash
   # Copy the example environment file
   cp .env.example .env
   ```

   Configure the following environment variables:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/gradeit?schema=public"

   # NextAuth
   AUTH_SECRET="generate-with-openssl-rand-base64-32"
   AUTH_GOOGLE_ID="your-google-oauth-id"
   AUTH_GOOGLE_SECRET="your-google-oauth-secret"

   # Judge0 API (from RapidAPI)
   JUDGE0_API_KEY="your-rapidapi-key"
   JUDGE0_API_HOST="judge0-ce.p.rapidapi.com"

   # Groq AI (optional, for AI features)
   GROQ_API_KEY="your-groq-api-key"

   # Application
   APP_URL="http://localhost:3000"
   ```

4. **Database Setup**

   ```bash
   # Run migrations to create database schema
   npx prisma migrate dev

   # Generate Prisma client
   npx prisma generate

   # (Optional) Seed database with sample data
   npx prisma db seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

### Docker Setup (Alternative)

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate dev

# View logs
docker-compose logs -f app
```

## Project Structure

```
GradeIt/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (dashboard)/     # Protected routes
│   │   ├── (landing)/       # Public pages
│   │   ├── api/            # API endpoints
│   │   └── _components/    # React components
│   ├── lib/                # Utilities & services
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── validators/     # Zod schemas
│   ├── server/             # Server-side code
│   │   └── actions/        # Server actions
│   └── config/             # App configuration
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── public/                 # Static assets
└── tests/                  # Test files
```

### Key Directories

- **`src/app/_components/`**: Reusable UI components (follow atomic design)
- **`src/app/api/`**: RESTful API routes
- **`src/server/actions/`**: Server actions for data mutations
- **`src/lib/services/`**: Business logic and external service integrations
- **`src/lib/types/`**: TypeScript type definitions
- **`prisma/`**: Database schema and migrations

## Development Workflow

### 1. Choose or Create an Issue

- Browse [open issues](https://github.com/Habeel-Shamsudeen/GradeIt/issues)
- Look for tags: `good-first-issue`, `help-wanted`, `bug`, `enhancement`
- Comment on the issue to claim it
- If creating a new issue, wait for maintainer approval

### 2. Create a Feature Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/issue-number-description
# Examples:
# - feature/123-add-export-grades
# - bugfix/456-fix-submission-error
# - chore/789-update-dependencies
```

### 3. Development Guidelines

- **Incremental Commits**: Make small, focused commits
- **Test Locally**: Ensure all features work as expected
- **Update Documentation**: Keep README and inline docs current
- **Follow Code Style**: Use ESLint and Prettier
- **Add Types**: Ensure TypeScript types are complete

### 4. Database Changes

When modifying the database schema:

```bash
# Create a migration
npx prisma migrate dev --name descriptive_migration_name

# Update Prisma client
npx prisma generate

# Test migration rollback
npx prisma migrate reset
```

### 5. Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- auth

# Run with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## Coding Standards

### TypeScript & React

```typescript
// ✅ Good: Explicit types, clear naming
interface AssignmentProps {
  id: string;
  title: string;
  dueDate: Date | null;
  onSubmit: (code: string) => Promise<void>;
}

export function AssignmentCard({
  id,
  title,
  dueDate,
  onSubmit,
}: AssignmentProps) {
  // Component logic
}

// ❌ Bad: Any types, unclear naming
export function Card({ data, fn }: any) {
  // Component logic
}
```

### File Organization

```typescript
// 1. Imports (grouped and ordered)
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createAssignment } from "@/server/actions/assignment-actions";

import type { Assignment } from "@/lib/types";

// 2. Types/Interfaces
interface ComponentProps {
  // ...
}

// 3. Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 4. Main component/function
export function Component() {
  // ...
}

// 5. Sub-components or utilities
function SubComponent() {
  // ...
}
```

### Styling Guidelines

```tsx
// Use Tailwind CSS utilities with cn() helper
import { cn } from "@/lib/utils";

<div
  className={cn(
    "flex items-center gap-2",
    isActive && "bg-primary",
    isDisabled && "opacity-50 cursor-not-allowed",
  )}
/>;

// Never use hardcoded colors
// ❌ Bad: style={{ color: '#3B82F6' }}
// ✅ Good: className="text-primary"
```

### API Route Patterns

```typescript
// app/api/[resource]/route.ts
import { auth } from "@/lib/auth";
import { z } from "zod";

const requestSchema = z.object({
  // Define request validation
});

export async function POST(req: Request) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validation
    const body = await req.json();
    const validatedData = requestSchema.parse(body);

    // 3. Business logic
    const result = await processRequest(validatedData);

    // 4. Response
    return Response.json({ success: true, data: result });
  } catch (error) {
    // 5. Error handling
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
```

### Component Best Practices

1. **Keep components small**: < 200 lines ideally
2. **Extract custom hooks**: Reuse stateful logic
3. **Use Server Components**: When possible for better performance
4. **Implement error boundaries**: For robust error handling
5. **Memoize expensive operations**: Use `useMemo` and `useCallback` appropriately

## Testing Requirements

### Unit Tests

```typescript
// __tests__/lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { calculateScore } from "@/lib/utils";

describe("calculateScore", () => {
  it("should calculate weighted score correctly", () => {
    const result = calculateScore(80, 90, 0.6, 0.4);
    expect(result).toBe(84); // (80 * 0.6) + (90 * 0.4)
  });

  it("should handle edge cases", () => {
    expect(calculateScore(0, 0, 0.5, 0.5)).toBe(0);
    expect(calculateScore(100, 100, 0.5, 0.5)).toBe(100);
  });
});
```

### Integration Tests

```typescript
// __tests__/api/compile.test.ts
import { describe, it, expect } from "vitest";

describe("POST /api/compile", () => {
  it("should compile valid Python code", async () => {
    const response = await fetch("/api/compile", {
      method: "POST",
      body: JSON.stringify({
        code: 'print("Hello")',
        language: "Python",
        input: "",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.output.output).toBe("Hello\n");
  });
});
```

### Test Coverage Requirements

- **Minimum coverage**: 70% for new code
- **Critical paths**: 90% coverage for auth, grading, submissions
- **UI Components**: Snapshot tests for complex components

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Test additions or fixes
- **chore**: Build process, dependencies, or tooling changes

### Examples

```bash
# Feature
feat(assignments): add bulk assignment creation
feat(auth): implement two-factor authentication

# Bug fix
fix(editor): resolve Monaco editor memory leak
fix(grading): correct score calculation for partial submissions

# Documentation
docs(readme): update installation instructions
docs(api): add webhook documentation

# Refactoring
refactor(components): migrate to Server Components
refactor(db): optimize submission queries

# Chores
chore(deps): upgrade to Next.js 15
chore(ci): add GitHub Actions workflow
```

### Commit Message Rules

1. Use present tense ("add feature" not "added feature")
2. Use imperative mood ("move cursor" not "moves cursor")
3. First line limited to 72 characters
4. Reference issues in footer: `Closes #123`

## Pull Request Process

### 1. Pre-Submission Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No console.logs or debugging code
- [ ] Branch is up-to-date with main
- [ ] All checks passing

### 2. PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Tested locally
- [ ] Added unit tests
- [ ] Added integration tests
- [ ] All tests passing

## Screenshots (if applicable)

[Add screenshots for UI changes]

## Related Issues

Closes #(issue number)

## Checklist

- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] New and existing tests pass locally
```

### 3. Review Process

1. **Automatic Checks**: Ensure CI/CD passes
2. **Code Review**: At least one maintainer approval required
3. **Testing**: Reviewers may request additional tests
4. **Documentation**: Ensure docs reflect changes
5. **Merge**: Maintainers will merge approved PRs

### 4. After Merge

```bash
# Update your local repository
git checkout main
git pull upstream main

# Delete your feature branch
git branch -d feature/your-branch
git push origin --delete feature/your-branch
```

## Issue Reporting

### Bug Reports

Include:

1. **Environment**: OS, browser, Node.js version
2. **Steps to reproduce**: Clear, numbered steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Screenshots/Logs**: If applicable
6. **Possible solution**: If you have ideas

### Feature Requests

Include:

1. **Use case**: Why this feature is needed
2. **Proposed solution**: How it should work
3. **Alternatives considered**: Other approaches
4. **Additional context**: Mockups, examples

## Security Vulnerabilities

**DO NOT** create public issues for security vulnerabilities!

Instead:

1. Email security details to maintainers
2. Use GitHub's security advisory feature
3. Allow time for patch before disclosure

Include:

- Vulnerability description
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

## Advanced Development

### Working with Prisma

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database (caution!)
npx prisma migrate reset

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

### Environment-Specific Configs

```typescript
// Use environment variables properly
const isProd = process.env.NODE_ENV === "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Never expose sensitive keys to client
// ❌ Bad: JUDGE0_API_KEY in client component
// ✅ Good: Call API route that uses the key server-side
```

### Performance Optimization

1. **Use React Server Components** where possible
2. **Implement proper caching** strategies
3. **Optimize images** with Next.js Image component
4. **Code split** with dynamic imports
5. **Minimize bundle size** with tree shaking

### Debugging Tips

```typescript
// Enable debug logging
localStorage.setItem("debug", "gradeit:*");

// Server-side debugging
console.log("DEBUG:", {
  timestamp: new Date().toISOString(),
  data: JSON.stringify(complexObject, null, 2),
});

// Use VS Code debugger
// Add to launch.json for Next.js debugging
```

## Getting Help

- **Discord**: Join our community server (coming soon)
- **GitHub Discussions**: Ask questions and share ideas
- **Stack Overflow**: Tag questions with `gradeit-platform`
- **Documentation**: Check `/docs` folder
- **Examples**: See `/examples` for common patterns

## Recognition

Contributors are recognized in:

- README.md contributors section
- GitHub contributors page
- Release notes
- Annual contributor spotlight (planned)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

---

Thank you for contributing to GradeIT! Your efforts help make programming education more accessible and efficient for everyone. 🚀
