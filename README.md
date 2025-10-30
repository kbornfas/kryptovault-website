# KryptoVault Investment Platform

A full-stack cryptocurrency investment platform built with NestJS (Backend) and React + Vite (Frontend).

[![Deployment Guide](https://img.shields.io/badge/Backend%20Deploy-Guide-brightgreen)](Backend/DEPLOYMENT.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## ✨ Features

- 💰 Multiple investment plans with customizable returns
- 👤 User authentication and authorization
- 🔐 KYC (Know Your Customer) verification system
- 💳 Crypto payment integration (BTC, ETH, USDT)
- 📊 Real-time earnings tracking
- 🔔 Push notifications
- 📱 Responsive admin dashboard
- 🎨 Modern UI with Chakra UI
- 🔒 Secure JWT-based authentication

## 🚀 Quick Deploy

### Option 1: Docker Compose (Recommended for Local Evaluation)

1. Copy the backend environment template and adjust values (see [Backend/.env.example](Backend/.env.example)).
2. From the repository root run:

	```powershell
	docker compose up --build
	```

	The backend will listen on `http://localhost:3000` and the frontend will be available at `http://localhost`.

3. Stop the stack with `Ctrl+C`, then clean up containers and volumes if needed via `docker compose down -v`.

### Option 2: Review the Deployment Guide for Production

Follow the detailed rollout plan in [`Backend/DEPLOYMENT.md`](Backend/DEPLOYMENT.md) to push the API, background workers, and supporting services to managed infrastructure (Render / Fly.io / Cloud Run, etc.).

### Option 3: Vercel (Frontend Only)

1. Sign up at [Vercel](https://vercel.com) and create a new project from this repository.
2. When prompted, set the project root directory to `frontend/`.
3. Define the build command as `pnpm --filter frontend build` and the output directory as `frontend/dist` (auto-detected via `vercel.json`).
4. Add the environment variable `VITE_API_URL` pointing to your backend (e.g. `https://api.yourdomain.com`).
5. Deploy — Vercel will run the configured build and serve the static output with SPA routing.

## Project Structure

```
kryptovault-website/
├── Backend/                 # NestJS API server
│   ├── src/                # Source code
│   ├── prisma/             # Database schema and migrations
│   └── package.json        # Backend dependencies
├── frontend/               # React + Vite client
│   ├── src/                # Source code
│   └── package.json        # Frontend dependencies
└── package.json            # Workspace configuration
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database
- Git

## Setup Instructions

### 1. Clone the repository
```bash
git clone <repository-url>
cd kryptovault-website
```

### 2. Install dependencies
```bash
# Install workspace dependencies and all sub-project dependencies
npm run install:all
```

### 3. Environment Setup

#### Backend Environment
```bash
cd Backend
cp .env.example .env
```

Edit `Backend/.env` with your database configuration:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/kryptovault"
JWT_SECRET="your_secure_jwt_secret_here"
PORT=3000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

#### Mailer Configuration
Populate the following variables in each environment to enable password reset emails:

```env
MAIL_HOST="smtp.yourprovider.com"
MAIL_PORT=587
MAIL_USER="smtp-user"
MAIL_PASSWORD="smtp-password"
MAIL_FROM="KryptoVault <no-reply@kryptovault.com>"
SUPPORT_EMAIL="support@kryptovault.com"
PASSWORD_RESET_URL_BASE="https://app.yourdomain.com"
```

To confirm connectivity, optionally set `MAIL_TEST_RECIPIENT` (and override `MAIL_TEST_SUBJECT`/`MAIL_TEST_BODY` if desired) then run:

```bash
pnpm --filter kryptovault-backend test:smtp
```

- The script verifies the SMTP credentials and, when `MAIL_TEST_RECIPIENT` is present, sends a one-off test message.
- Repeat this verification in staging/production to ensure each environment can dispatch email.

Once deployed with live credentials, monitor application logs for the warning string `Password reset email could not be delivered` immediately after password-reset tests. This warning indicates the transporter rejected the message and the reset token was cleared. If you see it, re-check the SMTP host/credentials or spam policies before retrying.

### 4. Database Setup
```bash
cd Backend
npx prisma migrate dev
npx prisma generate
```

## Development

### Run both services concurrently
```bash
npm run dev
```

### Run services separately

#### Backend only (Port 3000)
```bash
npm run dev:backend
```

#### Frontend only (Port 5173)
```bash
npm run dev:frontend
```

## 🧪 Testing & CI

Automated test coverage is not yet in place. To prevent regressions in core flows (authentication, payments, automation), prioritize the following:

- Backend (NestJS): enable Jest by adding targeted unit and integration specs for `modules/auth` and `modules/payments`, wiring Prisma test utilities for database interactions.
- Frontend (React): configure Vitest with React Testing Library to exercise protected routes, plan selection, and transaction views.
- CI: extend the existing GitHub Actions workflow to run backend Jest suites and frontend Vitest suites alongside linting before deploying.

## Available Scripts

### Workspace Level
- `npm run dev` - Run both backend and frontend in development mode
- `npm run build` - Build both backend and frontend for production
- `npm run lint` - Lint the backend service (frontend linting removed)
- `npm run install:all` - Install all dependencies

### Backend (NestJS)
- `npm run start:dev` - Development mode with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Run production build
- `npm run lint` - ESLint with auto-fix
- `npm run test` - Run tests

### Frontend (React + Vite)
- `npm run dev` - Development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## API Documentation

When the backend is running, visit: http://localhost:3000/api

## Technology Stack

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Framework**: Chakra UI
- **Styling**: TailwindCSS
- **State Management**: React Context + React Query
- **Routing**: React Router v6

## Folder Structure

### Backend Structure
```
Backend/src/
├── modules/
│   ├── auth/              # Authentication & authorization
│   ├── users/             # User management
│   ├── investments/       # Investment logic
│   ├── plans/             # Investment plans
│   ├── transactions/      # Transaction handling
│   ├── notifications/     # Notification system
│   └── payments/          # Payment processing
├── prisma/                # Prisma service
├── config/                # Configuration modules
├── app.module.ts          # Root application module
└── main.ts                # Application entry point
```

### Frontend Structure
```
frontend/src/
├── components/            # Reusable UI components
├── routes/                # Page components
├── context/               # React Context providers
├── hooks/                 # Custom React hooks
├── assets/                # Static assets
└── types.d.ts             # TypeScript type definitions
```

## Contributing

1. Follow the established coding standards
2. Use TypeScript for type safety
3. Write tests for new features
4. Run linting before committing
5. Follow conventional commit messages

## License

This project is private and proprietary.