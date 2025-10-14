# KryptoVault Investment Platform

A full-stack investment platform built with NestJS (Backend) and React + Vite (Frontend).

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

## Available Scripts

### Workspace Level
- `npm run dev` - Run both backend and frontend in development mode
- `npm run build` - Build both backend and frontend for production
- `npm run lint` - Lint both backend and frontend
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
- `npm run lint` - ESLint check

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