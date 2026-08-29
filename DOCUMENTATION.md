# GradeIT - Official Documentation

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Security](#security)
- [Deployment](#deployment)
- [Performance & Scaling](#performance--scaling)
- [Future Roadmap](#future-roadmap)

## Overview

**GradeIT** is a comprehensive automated online coding platform designed specifically for college-level programming lab assignments. It revolutionizes the traditional manual grading process by providing an intelligent, scalable solution that automates code execution, testing, and evaluation while maintaining academic integrity.

### Core Value Proposition

- **For Educators**: Eliminate manual grading overhead, monitor student progress in real-time, and focus on teaching rather than repetitive evaluation tasks
- **For Students**: Receive instant feedback, test code against multiple cases, and learn through iterative development
- **For Institutions**: Standardize assessment processes, maintain academic integrity, and scale programming education efficiently

## Features

### 🎯 Core Platform Features

#### 1. **Automated Code Execution & Grading**

- **Judge0 Integration**: Secure, sandboxed code execution environment
- **Multi-Language Support**: 11 programming languages including:
  - Python (Standard & ML Environment)
  - JavaScript/TypeScript
  - C/C++
  - Java
  - Go
  - Rust
  - Bash
  - Assembly (WebAssembly)
- **Real-time Execution**: Immediate compilation and runtime feedback
- **Resource Limits**: CPU time (2s) and memory (128MB) constraints for safe execution

#### 2. **Intelligent Test Case System**

- **Visible & Hidden Test Cases**: Public test cases for practice, hidden cases for assessment
- **AI-Powered Generation**: Automatic test case creation using Groq LLM (Llama 3.3 70B)
- **Comprehensive Coverage**: Edge cases, boundary conditions, and corner cases automatically generated
- **Custom Test Runs**: Students can test with custom inputs before submission

#### 3. **Advanced Evaluation System**

- **Dual-Mode Scoring**:
  - **Test Case Evaluation** (Default 60% weight): Automated correctness checking
  - **Metrics-Based Evaluation** (Default 40% weight): AI-powered code quality assessment
- **Custom Evaluation Metrics**: Faculty can define custom metrics like:
  - Code Quality & Readability
  - Performance Optimization
  - Best Practices Adherence
  - Algorithm Efficiency
- **Weighted Scoring**: Configurable weight distribution between test cases and metrics
- **LLM-Powered Analysis**: Intelligent code review using Groq's Llama model for qualitative assessment

### 👩‍🏫 Faculty Features

#### 1. **Classroom Management**

- **Virtual Classrooms**: Create and manage multiple classes
- **Unique Access Codes**: Auto-generated classroom codes and invite links
- **Student Enrollment**: Track enrolled students and manage access
- **Batch Operations**: Bulk student management capabilities

#### 2. **Assignment Creation & Configuration**

- **Multi-Question Assignments**: Build comprehensive programming assignments
- **Rich Problem Statements**: Markdown support for detailed descriptions
- **Flexible Deadlines**: Start date, due date, and late submission policies
- **Proctoring Options**:
  - Copy-paste prevention
  - Fullscreen enforcement
  - Activity monitoring
- **Scoring Configuration**: Adjust test case vs metrics weights per assignment

#### 3. **Real-Time Monitoring & Analytics**

- **Live Progress Tracking**: Monitor student coding sessions in real-time
- **Submission Analytics**:
  - Completion rates
  - Score distributions
  - Time-to-submission metrics
  - Common error patterns
- **Individual Performance Reports**: Detailed student-wise analysis
- **Export Capabilities**: Download analytics data for external processing

#### 4. **Comprehensive Review Tools**

- **Code Comparison**: View multiple submissions side-by-side
- **Detailed Test Results**: See exact outputs vs expected for each test case
- **Execution Metrics**: Runtime, memory usage, and error logs
- **Historical Tracking**: Access all submission attempts with timestamps

### 👨‍🎓 Student Features

#### 1. **Interactive Development Environment**

- **Monaco Editor Integration**: VSCode-powered editor with:
  - Syntax highlighting
  - IntelliSense auto-completion
  - Multi-cursor support
  - Language-specific formatting
- **Theme Support**: Light/dark mode with system preference detection
- **Responsive Design**: Optimized for desktop and tablet devices

#### 2. **Testing & Submission**

- **Run Custom Tests**: Execute code with custom inputs before submission
- **View Sample Cases**: Access visible test cases with expected outputs
- **Instant Feedback**: Real-time compilation errors and runtime results
- **Multiple Attempts**: Submit multiple times (if allowed) with history tracking

#### 3. **Progress Tracking**

- **Submission History**: Complete log of all attempts with scores
- **Performance Metrics**: Execution time, memory usage per submission
- **Status Indicators**:
  - NOT_STARTED
  - IN_PROGRESS
  - COMPLETED
  - LATE_SUBMISSION
  - PARTIAL
  - FAILED

### 🔒 Security & Academic Integrity

#### 1. **Proctoring Features**

- **Copy-Paste Prevention**: Disable clipboard operations during assessments
- **Fullscreen Enforcement**: Mandatory fullscreen mode with exit detection
- **Activity Logging**: Track focus/blur events and tab switches
- **Submission Timestamps**: Accurate tracking for deadline enforcement

#### 2. **Code Execution Security**

- **Sandboxed Environment**: Isolated execution via Judge0 containers
- **Resource Limits**: Prevent infinite loops and memory bombs
- **Network Isolation**: No external network access during execution
- **Input Sanitization**: Protection against injection attacks

#### 3. **Authentication & Authorization**

- **OAuth 2.0**: Secure Google authentication via NextAuth.js
- **Role-Based Access Control (RBAC)**: Distinct Faculty and Student roles
- **Session Management**: JWT-based secure sessions
- **API Protection**: All endpoints require authentication

## System Architecture

### Frontend Architecture

```
src/app/
├── (dashboard)/        # Protected dashboard routes
│   ├── classes/       # Classroom management
│   └── settings/      # User preferences
├── (landing)/         # Public landing page
├── api/              # API route handlers
├── _components/      # Reusable UI components
│   ├── assignments/  # Assignment-specific components
│   ├── classes/      # Classroom components
│   ├── ui/          # Shadcn UI primitives
│   └── testcase/    # Test case management
└── styles/          # Global styles
```

### Backend Architecture

```
src/
├── server/actions/    # Server actions (Next.js 14)
│   ├── assignment-actions.ts
│   ├── class-actions.ts
│   ├── grading-actions.ts
│   ├── submission-actions.ts
│   └── user-actions.ts
├── lib/
│   ├── services/     # Business logic services
│   │   ├── llm-service.ts           # AI integration
│   │   └── code-evaluation-llm-service.ts
│   ├── validators/   # Zod schemas
│   └── types/       # TypeScript definitions
└── config/          # Application configuration
```

### Data Flow Architecture

1. **Synchronous Flow**:
   - User Request → Next.js API Route → Server Action → Database → Response

2. **Asynchronous Flow** (Code Execution):
   - Submit Code → Judge0 API (with webhook) → Background Processing → Update Database → Real-time UI Update

3. **AI Evaluation Pipeline**:
   - Code Submission → Test Case Execution → Metrics Evaluation (LLM) → Score Calculation → Database Update

## Tech Stack

### Core Technologies

| Category           | Technology   | Version    | Purpose                                    |
| ------------------ | ------------ | ---------- | ------------------------------------------ |
| **Framework**      | Next.js      | 15.2.4     | Full-stack React framework with App Router |
| **Language**       | TypeScript   | 5.x        | Type-safe development                      |
| **Database**       | PostgreSQL   | Latest     | Relational data storage                    |
| **ORM**            | Prisma       | 6.7.0      | Type-safe database queries                 |
| **Authentication** | NextAuth.js  | 5.0.0-beta | OAuth and session management               |
| **Styling**        | Tailwind CSS | 3.4.1      | Utility-first CSS framework                |
| **UI Components**  | Shadcn/ui    | Latest     | Accessible component library               |

### Key Dependencies

| Package                | Purpose                         |
| ---------------------- | ------------------------------- |
| `@monaco-editor/react` | Code editor integration         |
| `@ai-sdk/groq`         | LLM integration for AI features |
| `framer-motion`        | Animation library               |
| `zod`                  | Runtime type validation         |
| `react-hook-form`      | Form management                 |
| `sonner`               | Toast notifications             |
| `date-fns`             | Date manipulation               |
| `hugeicons-react`      | Icon library                    |

### External Services

| Service          | Purpose                 | Configuration         |
| ---------------- | ----------------------- | --------------------- |
| **Judge0 CE**    | Code execution engine   | RapidAPI integration  |
| **Groq Cloud**   | LLM API for AI features | Llama 3.3 70B model   |
| **Google OAuth** | Authentication provider | OAuth 2.0 credentials |

## API Reference

### RESTful Endpoints

#### `/api/compile` (POST)

Execute code with custom input

```typescript
Request: {
  code: string;
  language: string;
  input?: string;
}
Response: {
  output: {
    status: "passed" | "failed";
    output?: string;
    error?: string;
    runtime: string;
    memory: string;
  }
}
```

#### `/api/submissions` (POST)

Submit code for grading

```typescript
Request: {
  submissionId: string;
  codeSubmissions: Array<{
    questionId: string;
    code: string;
    language: string;
  }>;
}
Response: {
  success: boolean;
  message: string;
}
```

#### `/api/generate-testcases` (POST)

Generate test cases using AI

```typescript
Request: {
  questionTitle: string;
  questionDescription: string;
  language: string;
  sampleInput?: string;
  sampleOutput?: string;
  noOfTCRequired?: number;
}
Response: {
  testCases: Array<{
    input: string;
    expectedOutput: string;
    hidden: boolean;
  }>
}
```

#### `/api/webhook/judge0` (PUT)

Webhook endpoint for Judge0 results (Internal use only)

### Server Actions

Server actions provide type-safe data mutations:

- `createClassroom()` - Create new classroom
- `joinClassroom()` - Student enrollment
- `createAssignment()` - Create new assignment
- `submitCode()` - Submit code for evaluation
- `getSubmissionHistory()` - Fetch submission records
- `updateUserRole()` - Change user role

## Database Schema

### Core Models

#### User Model

- Supports Faculty and Student roles
- OAuth integration via Account model
- Tracks onboarding status

#### Classroom Model

- Many-to-many relationship with Users
- Unique access codes and invite links
- Faculty ownership tracking

#### Assignment Model

- Belongs to Classroom
- Contains multiple Questions
- Configurable proctoring settings
- Weighted scoring system

#### Submission Model

- Links Student to Assignment
- Tracks submission status
- Maintains submission history
- Unique constraint per student-assignment pair

#### Evaluation Models

- **TestCase**: Input-output pairs with visibility control
- **TestCaseResult**: Execution results with Judge0 tokens
- **EvaluationMetric**: Custom quality metrics
- **SubmissionMetricResult**: AI evaluation scores

### Relationships

```
User ←→ Classroom (Many-to-Many)
Classroom → Assignment (One-to-Many)
Assignment → Question (One-to-Many)
Question → TestCase (One-to-Many)
Student → Submission → CodeSubmission (One-to-Many)
CodeSubmission → TestCaseResult (One-to-Many)
CodeSubmission → SubmissionMetricResult (One-to-Many)
```

## Security

### Authentication Security

- **OAuth 2.0**: Industry-standard authentication
- **JWT Sessions**: Secure, stateless session management
- **CSRF Protection**: Built-in Next.js CSRF tokens
- **Secure Cookies**: HttpOnly, Secure, SameSite attributes

### Code Execution Security

- **Sandboxing**: Isolated Docker containers via Judge0
- **Resource Limits**: CPU and memory constraints
- **Network Isolation**: No external network access
- **Input Validation**: Zod schemas for all inputs

### Data Security

- **Environment Variables**: Sensitive data in `.env` files
- **Database Encryption**: SSL/TLS for database connections
- **API Rate Limiting**: Protection against abuse (25 requests limit)
- **SQL Injection Prevention**: Prisma ORM parameterized queries

### Academic Integrity

- **Proctoring Features**: Copy-paste and fullscreen controls
- **Submission Tracking**: Immutable audit logs
- **Time Stamps**: Accurate submission timing
- **Hidden Test Cases**: Prevent hardcoded solutions

## Deployment

### Production Deployment (Vercel)

1. **Prerequisites**:
   - Vercel account
   - PostgreSQL database (Supabase/Neon recommended)
   - API keys (Judge0, Groq, Google OAuth)

2. **Deployment Steps**:

   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel --prod
   ```

3. **Environment Variables** (Set in Vercel Dashboard):
   - `DATABASE_URL` - PostgreSQL connection string
   - `AUTH_SECRET` - Random secret for NextAuth
   - `AUTH_GOOGLE_ID` - Google OAuth client ID
   - `AUTH_GOOGLE_SECRET` - Google OAuth secret
   - `JUDGE0_API_KEY` - RapidAPI key for Judge0
   - `JUDGE0_API_HOST` - Judge0 host URL
   - `GROQ_API_KEY` - Groq AI API key
   - `APP_URL` - Production URL for webhooks

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Run database migrations
docker-compose exec app npx prisma migrate deploy
```

### Self-Hosting Requirements

- **Server**: 2+ CPU cores, 4GB+ RAM
- **Database**: PostgreSQL 13+
- **Node.js**: v18+ or v22+ (Alpine)
- **Storage**: 10GB+ for application and logs

## Performance & Scaling

### Current Performance Metrics

- **Page Load**: < 2s (optimized with Next.js App Router)
- **Code Execution**: 2-5s (including Judge0 API calls)
- **AI Evaluation**: 3-8s (LLM processing time)
- **Database Queries**: < 100ms (optimized with indexes)

### Optimization Strategies

1. **Frontend Optimizations**:
   - Code splitting with dynamic imports
   - Image optimization with Next.js Image
   - Lazy loading for heavy components
   - React Server Components for initial load

2. **Backend Optimizations**:
   - Database query optimization with Prisma
   - Webhook-based async processing
   - Caching strategies for static data
   - Connection pooling for database

3. **Scaling Considerations**:
   - **Horizontal Scaling**: Stateless architecture supports multiple instances
   - **Database Scaling**: Read replicas for analytics queries
   - **CDN Integration**: Static assets via Vercel Edge Network
   - **Queue System**: Consider adding Redis/BullMQ for heavy loads

### Bottlenecks & Solutions

- **Judge0 API Limits**: Implement queuing system for high submission volumes
- **LLM Rate Limits**: Cache evaluation results for identical code
- **Database Connections**: Use connection pooling (PgBouncer)
- **Real-time Updates**: Consider WebSockets for live monitoring

## Future Roadmap

### Planned Features

#### Phase 1: Enhanced Features (Q1 2025)

- [ ] **Plagiarism Detection**: Code similarity analysis across submissions
- [ ] **Advanced Analytics**: ML-powered insights on student performance
- [ ] **Collaborative Coding**: Pair programming support
- [ ] **Custom Language Support**: Admin-defined language configurations

#### Phase 2: Platform Expansion (Q2 2025)

- [ ] **Mobile Application**: Native iOS/Android apps
- [ ] **API Gateway**: Public API for third-party integrations
- [ ] **Multi-tenancy**: Institution-level isolation
- [ ] **Custom Branding**: White-label support

#### Phase 3: AI Enhancement (Q3 2025)

- [ ] **Intelligent Hints**: AI-powered coding assistance
- [ ] **Auto-grading Improvements**: Better partial credit algorithms
- [ ] **Natural Language Questions**: Convert English to test cases
- [ ] **Performance Predictions**: ML-based success forecasting

### Dropped Features (Originally Planned)

- **Live Code Sharing**: Replaced with submission-based review
- **Video Proctoring**: Deemed too resource-intensive
- **Peer Review System**: Postponed for future consideration
- **IDE Plugins**: Focus shifted to web-based editor

### Technical Improvements

- [ ] **GraphQL API**: Replace REST with GraphQL
- [ ] **Microservices Architecture**: Separate execution service
- [ ] **Event-Driven Architecture**: Kafka/RabbitMQ integration
- [ ] **Kubernetes Deployment**: Container orchestration

## Support & Resources

### Documentation

- **User Guide**: Available in-app for both Faculty and Students
- **API Documentation**: Swagger/OpenAPI specs (planned)
- **Video Tutorials**: YouTube channel (planned)

### Community

- **GitHub Issues**: Bug reports and feature requests
- **Discord Server**: Community support (planned)
- **Stack Overflow**: Tag: `gradeit-platform`

### Contact

- **Technical Support**: Via GitHub Issues
- **Security Issues**: Private disclosure via repository security tab
- **Partnership Inquiries**: Through official website contact form

---

_Last Updated: January 2025_
_Version: 1.0.0_
