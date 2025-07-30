# Fan Club Z - Cursor AI Engineering Standards
*Version 1.0 | Date: July 27, 2025*

## Table of Contents
1. [Overview](#overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Git Workflow & Branching Strategy](#git-workflow--branching-strategy)
4. [Code Quality Standards](#code-quality-standards)
5. [Testing Strategy](#testing-strategy)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Version Management](#version-management)
8. [Environment Management](#environment-management)
9. [AI Development Guidelines](#ai-development-guidelines)
10. [Security & Compliance](#security--compliance)
11. [Monitoring & Observability](#monitoring--observability)
12. [Documentation Standards](#documentation-standards)

---

## Overview

### Project Context
Fan Club Z is a social prediction platform built with React/TypeScript frontend, Node.js/Express microservices backend, PostgreSQL database, and Polygon blockchain integration. This document establishes engineering standards for Cursor AI IDE to ensure consistent, secure, and maintainable development practices.

### Core Principles
1. **Safety First**: Never commit breaking changes or security vulnerabilities
2. **Test-Driven Development**: Write tests before implementation
3. **Code Quality**: Maintain high standards through automation
4. **Documentation**: Keep code self-documenting and well-commented
5. **Security by Design**: Implement security at every layer
6. **Performance**: Optimize for mobile-first experience

---

## Development Environment Setup

### Required Tools & Versions
```json
{
  "node": ">=18.0.0",
  "npm": ">=9.0.0",
  "typescript": "^5.0.0",
  "git": ">=2.40.0",
  "docker": ">=24.0.0",
  "terraform": ">=1.5.0"
}
```

### Project Structure Validation
Before starting any work, verify the project structure matches the expected layout:

```
Fan Club Z v2.0/
├── client/                 # React frontend
├── server/                 # Node.js backend services
├── shared/                 # Shared TypeScript types
├── smart-contracts/        # Solidity contracts
├── infra/                  # Terraform infrastructure
├── docs/                   # Documentation
├── tests/                  # End-to-end tests
├── scripts/                # Utility scripts
├── .github/workflows/      # CI/CD pipelines
├── package.json
├── tsconfig.json
└── docker-compose.yml
```

### Environment Variables
Always verify these environment files exist:
- `.env.local` (development)
- `.env.staging` (staging environment)
- `.env.production` (production - never commit)

### Pre-Development Checklist
- [ ] Verify Node.js and npm versions
- [ ] Run `npm install` in root and all service directories
- [ ] Verify database connection (PostgreSQL)
- [ ] Verify Redis connection
- [ ] Test blockchain connection (Polygon testnet)
- [ ] Run `npm run type-check` to verify TypeScript compilation
- [ ] Run `npm run test` to ensure all tests pass

---

## Git Workflow & Branching Strategy

### Branch Structure
```
main                    # Production-ready code
├── develop            # Integration branch for features
├── staging            # Pre-production testing
├── feature/*          # Feature development
├── bugfix/*           # Bug fixes
├── hotfix/*           # Critical production fixes
└── release/*          # Release preparation
```

### Branch Naming Conventions
- Feature: `feature/FCZ-123-add-bet-creation`
- Bugfix: `bugfix/FCZ-456-fix-wallet-balance`
- Hotfix: `hotfix/FCZ-789-critical-security-fix`
- Release: `release/v1.2.0`

### Commit Message Standards
Follow Conventional Commits specification:
```
type(scope): description

feat(auth): add 2FA authentication flow
fix(wallet): resolve balance calculation error
docs(api): update OpenAPI specification
test(bets): add unit tests for bet creation
chore(deps): update dependency versions
```

### Branch Protection Rules
**Main Branch:**
- Require pull request reviews (minimum 1)
- Require status checks to pass
- Require branches to be up to date
- Restrict pushes to administrators only

**Develop Branch:**
- Require pull request reviews
- Require status checks to pass
- Allow force pushes from administrators

### Pre-Commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run type-check",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
      "pre-push": "npm run test && npm run build"
    }
  }
}
```

---

## Code Quality Standards

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:security/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "no-debugger": "error",
    "prefer-const": "error",
    "no-var": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### Code Style Guidelines

#### File Naming
- Components: `PascalCase.tsx` (e.g., `BetCard.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatCurrency.ts`)
- Constants: `UPPER_SNAKE_CASE.ts` (e.g., `API_ENDPOINTS.ts`)
- Types: `PascalCase.types.ts` (e.g., `User.types.ts`)

#### Component Structure
```typescript
// 1. Imports (external libs first, then internal)
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

import { useBetStore } from '@/store/betStore';
import { BetCard } from './BetCard';

// 2. Types/Interfaces
interface BetListProps {
  filters?: BetFilters;
  onBetSelect: (bet: Bet) => void;
}

// 3. Component
export const BetList: React.FC<BetListProps> = ({ filters, onBetSelect }) => {
  // 4. State and hooks
  const [loading, setLoading] = useState(false);
  const { bets, fetchBets } = useBetStore();

  // 5. Effects
  useEffect(() => {
    fetchBets(filters);
  }, [filters]);

  // 6. Event handlers
  const handleBetClick = (bet: Bet): void => {
    onBetSelect(bet);
  };

  // 7. Render
  return (
    <div className="bet-list">
      {/* Component JSX */}
    </div>
  );
};
```

#### API Service Structure
```typescript
// services/betService.ts
import { apiClient } from './apiClient';
import { Bet, CreateBetRequest, BetListResponse } from '@/types';

export class BetService {
  private static readonly BASE_PATH = '/api/v2/bets';

  static async createBet(data: CreateBetRequest): Promise<Bet> {
    try {
      const response = await apiClient.post<Bet>(this.BASE_PATH, data);
      return response.data;
    } catch (error) {
      // Log error but don't expose internal details
      console.error('Failed to create bet:', error);
      throw new Error('Failed to create bet');
    }
  }

  static async getBets(params?: BetFilters): Promise<BetListResponse> {
    // Implementation with proper error handling
  }
}
```

### Code Review Checklist
- [ ] TypeScript compilation passes without errors
- [ ] All tests pass
- [ ] No console.log or debugger statements
- [ ] Proper error handling implemented
- [ ] Security considerations addressed
- [ ] Performance implications considered
- [ ] Accessibility requirements met
- [ ] Mobile responsiveness verified

---

## Testing Strategy

### Testing Pyramid
```
E2E Tests (10%)           # Critical user journeys
├── Integration Tests (20%) # API endpoints, service interactions
└── Unit Tests (70%)       # Individual functions, components
```

### Unit Testing Standards

#### Frontend (Jest + React Testing Library)
```typescript
// BetCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BetCard } from './BetCard';
import { mockBet } from '@/mocks/betMocks';

describe('BetCard', () => {
  it('should display bet title and description', () => {
    render(<BetCard bet={mockBet} />);
    
    expect(screen.getByText(mockBet.title)).toBeInTheDocument();
    expect(screen.getByText(mockBet.description)).toBeInTheDocument();
  });

  it('should call onBetSelect when clicked', () => {
    const onBetSelect = jest.fn();
    render(<BetCard bet={mockBet} onBetSelect={onBetSelect} />);
    
    fireEvent.click(screen.getByRole('button', { name: /place bet/i }));
    
    expect(onBetSelect).toHaveBeenCalledWith(mockBet);
  });
});
```

#### Backend (Jest + Supertest)
```typescript
// betController.test.ts
import request from 'supertest';
import { app } from '../app';
import { BetService } from '../services/BetService';

jest.mock('../services/BetService');

describe('POST /api/v2/bets', () => {
  it('should create a new bet', async () => {
    const mockBet = { id: '123', title: 'Test Bet' };
    (BetService.createBet as jest.Mock).mockResolvedValue(mockBet);

    const response = await request(app)
      .post('/api/v2/bets')
      .send({ title: 'Test Bet', type: 'binary' })
      .expect(201);

    expect(response.body).toEqual(mockBet);
  });
});
```

### Integration Testing
```typescript
// betIntegration.test.ts
describe('Bet Creation Flow', () => {
  it('should create bet and update database', async () => {
    // Test database integration
    const betData = { title: 'Integration Test', type: 'binary' };
    const bet = await BetService.createBet(betData);
    
    expect(bet.id).toBeDefined();
    
    // Verify database state
    const savedBet = await db.bet.findUnique({ where: { id: bet.id } });
    expect(savedBet?.title).toBe(betData.title);
  });
});
```

### E2E Testing (Playwright)
```typescript
// e2e/betCreation.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and place bet', async ({ page }) => {
  await page.goto('/');
  
  // Navigate to create bet
  await page.click('[data-testid="create-bet-tab"]');
  
  // Fill bet form
  await page.fill('[data-testid="bet-title"]', 'Test E2E Bet');
  await page.selectOption('[data-testid="bet-type"]', 'binary');
  
  // Submit bet
  await page.click('[data-testid="submit-bet"]');
  
  // Verify bet creation
  await expect(page.locator('[data-testid="bet-success"]')).toBeVisible();
});
```

### Test Data Management
```typescript
// mocks/betMocks.ts
export const mockBet: Bet = {
  id: 'test-bet-1',
  title: 'Mock Bet Title',
  description: 'Mock bet description',
  type: 'binary',
  status: 'open',
  creatorId: 'test-user-1',
  stakeMin: 10,
  poolTotal: 0,
  entryDeadline: new Date('2025-12-31'),
  options: [
    { id: 'opt-1', label: 'Yes', totalStaked: 0 },
    { id: 'opt-2', label: 'No', totalStaked: 0 }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### Test Coverage Requirements
- Unit Tests: Minimum 80% coverage
- Integration Tests: All API endpoints covered
- E2E Tests: Critical user journeys (login, bet creation, wallet operations)

---

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop, staging]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd client && npm ci
          cd ../server && npm ci
      
      - name: Lint
        run: |
          npm run lint
          npm run lint:client
          npm run lint:server
      
      - name: Type Check
        run: |
          npm run type-check
          npm run type-check:client
          npm run type-check:server
      
      - name: Unit Tests
        run: |
          npm run test:unit
          npm run test:client
          npm run test:server
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fanclubz_test
          REDIS_URL: redis://localhost:6379
      
      - name: Integration Tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fanclubz_test
          REDIS_URL: redis://localhost:6379
      
      - name: Build
        run: |
          npm run build
          npm run build:client
          npm run build:server
      
      - name: E2E Tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fanclubz_test

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Run SAST scan
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript

  deploy-staging:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to staging
        run: |
          terraform init -backend-config="key=staging/terraform.tfstate"
          terraform plan -var-file="staging.tfvars"
          terraform apply -auto-approve -var-file="staging.tfvars"

  deploy-production:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to production
        run: |
          terraform init -backend-config="key=production/terraform.tfstate"
          terraform plan -var-file="production.tfvars"
          terraform apply -auto-approve -var-file="production.tfvars"
```

### Deployment Gates
- **Staging**: Automatic deployment on `staging` branch
- **Production**: Manual approval required + successful staging deployment
- **Rollback**: Automated rollback on health check failures

---

## Version Management

### Semantic Versioning
Follow SemVer (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Process
1. Create release branch: `release/v1.2.0`
2. Update version in `package.json`
3. Update CHANGELOG.md
4. Create pull request to `main`
5. Tag release after merge: `git tag v1.2.0`
6. Deploy to production
7. Merge back to `develop`

### Changelog Format
```markdown
# Changelog

## [1.2.0] - 2025-07-27

### Added
- New bet creation flow with enhanced validation
- Social sharing functionality for bets

### Changed
- Improved wallet balance display performance
- Updated API response format for better consistency

### Fixed
- Fixed race condition in bet settlement process
- Resolved mobile navigation issues on iOS

### Security
- Enhanced JWT token validation
- Added rate limiting to sensitive endpoints

### Deprecated
- Legacy bet creation API (will be removed in v2.0.0)
```

---

## Environment Management

### Environment Configuration

#### Development Environment
```env
# .env.local
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/fanclubz_dev
REDIS_URL=redis://localhost:6379
BLOCKCHAIN_NETWORK=polygon-mumbai
LOG_LEVEL=debug
ENABLE_MOCK_PAYMENTS=true
```

#### Staging Environment
```env
# .env.staging
NODE_ENV=staging
DATABASE_URL=postgresql://staging-db:5432/fanclubz_staging
REDIS_URL=redis://staging-redis:6379
BLOCKCHAIN_NETWORK=polygon-mumbai
LOG_LEVEL=info
ENABLE_MOCK_PAYMENTS=false
```

#### Production Environment
```env
# .env.production (stored in AWS Secrets Manager)
NODE_ENV=production
DATABASE_URL=postgresql://prod-db:5432/fanclubz_prod
REDIS_URL=redis://prod-redis:6379
BLOCKCHAIN_NETWORK=polygon-mainnet
LOG_LEVEL=warn
ENABLE_MOCK_PAYMENTS=false
```

### Infrastructure as Code
```hcl
# infra/environments/production/main.tf
module "fanclubz_production" {
  source = "../../modules/fanclubz"
  
  environment = "production"
  region      = "us-east-1"
  
  # Database configuration
  db_instance_class = "db.r6g.xlarge"
  db_allocated_storage = 100
  
  # Application configuration
  app_instance_count = 3
  app_instance_type  = "c6i.large"
  
  # Auto-scaling configuration
  min_capacity = 2
  max_capacity = 10
  
  tags = {
    Environment = "production"
    Project     = "fanclubz"
  }
}
```

### Environment Promotion Pipeline
```
feature/branch → develop → staging → main → production
     ↓              ↓         ↓        ↓         ↓
   Local         Dev Env   Staging  Pre-prod  Production
```

---

## AI Development Guidelines

### Cursor AI Safety Protocols

#### Before Making Changes
1. **Read Current State**: Always examine existing code structure
2. **Understand Context**: Review related files and dependencies
3. **Check Tests**: Ensure existing tests provide coverage
4. **Validate Types**: Verify TypeScript types are correct

#### Code Modification Protocol
```typescript
// ALWAYS follow this pattern for modifications:

// 1. Backup approach - preserve working code
const originalFunction = existingFunction;

// 2. Implement new functionality
const enhancedFunction = (params: ValidatedTypes) => {
  // Implementation with proper error handling
  try {
    // New logic here
    return result;
  } catch (error) {
    console.error('Enhancement failed, falling back:', error);
    return originalFunction(params);
  }
};

// 3. Gradual replacement with feature flags
const useEnhancedVersion = process.env.FEATURE_ENHANCED_FUNCTION === 'true';
export const currentFunction = useEnhancedVersion ? enhancedFunction : originalFunction;
```

#### Hallucination Prevention
- **Never** invent API endpoints that don't exist
- **Always** check the OpenAPI specification before adding API calls
- **Verify** imports exist before using them
- **Confirm** environment variables are properly defined
- **Test** changes in development environment first

#### Safe Refactoring Guidelines
```typescript
// DO: Gradual, backwards-compatible changes
interface UserV1 {
  id: string;
  name: string;
}

interface UserV2 extends UserV1 {
  email?: string; // Optional for backwards compatibility
}

// DON'T: Breaking changes without migration path
interface User {
  userId: string; // This breaks existing code expecting 'id'
  fullName: string; // This breaks existing code expecting 'name'
}
```

### Code Generation Standards
When generating new code, always include:
```typescript
/**
 * Generated by Cursor AI on ${date}
 * Purpose: ${description}
 * Dependencies: ${list_dependencies}
 * Tests: ${test_file_location}
 */
```

### API Integration Protocol
```typescript
// ALWAYS validate API responses
interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

const safeAPICall = async <T>(endpoint: string): Promise<T> => {
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: APIResponse<T> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API call failed');
    }
    
    return result.data;
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
};
```

### Database Operation Safety
```typescript
// ALWAYS use transactions for multi-table operations
const safeUserCreation = async (userData: CreateUserRequest) => {
  const transaction = await db.transaction();
  
  try {
    // Create user
    const user = await transaction.user.create({ data: userData });
    
    // Create wallet
    await transaction.wallet.create({
      data: { userId: user.id, balance: 0 }
    });
    
    await transaction.commit();
    return user;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

---

## Security & Compliance

### Security Checklist for Every Change
- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS protection in place
- [ ] Authentication/authorization checked
- [ ] Sensitive data properly encrypted
- [ ] Rate limiting applied where needed
- [ ] CORS configured correctly
- [ ] Dependencies updated and scanned

### Code Security Patterns
```typescript
// Input validation
import { z } from 'zod';

const CreateBetSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000),
  type: z.enum(['binary', 'multi_outcome', 'pool']),
  stakeMin: z.number().positive(),
  stakeMax: z.number().positive().optional()
});

export const validateCreateBet = (data: unknown) => {
  return CreateBetSchema.parse(data);
};

// SQL injection prevention
const getUserBets = async (userId: string) => {
  // Use parameterized queries
  return await db.bet.findMany({
    where: { creatorId: userId } // Prisma handles parameterization
  });
};

// XSS prevention
import DOMPurify from 'dompurify';

const sanitizeUserInput = (input: string): string => {
  return DOMPurify.sanitize(input);
};
```

### Environment Variable Security
```typescript
// Never commit secrets
const config = {
  database: {
    url: process.env.DATABASE_URL || (() => {
      throw new Error('DATABASE_URL is required');
    })()
  },
  jwt: {
    secret: process.env.JWT_SECRET || (() => {
      throw new Error('JWT_SECRET is required');
    })()
  }
};
```

---

## Monitoring & Observability

### Logging Standards
```typescript
import { Logger } from 'winston';

// Structured logging
const logger = Logger.child({
  service: 'bet-service',
  version: process.env.APP_VERSION
});

// Log levels and usage
logger.error('Critical error occurred', { 
  error: error.message, 
  stack: error.stack,
  userId,
  betId 
});

logger.warn('Unusual behavior detected', { 
  metric: 'unusual_bet_pattern',
  userId,
  details 
});

logger.info('Bet created successfully', { 
  betId, 
  userId, 
  type: bet.type 
});

logger.debug('Processing bet validation', { 
  betId, 
  validationRules 
});
```

### Performance Monitoring
```typescript
// Performance tracking
const startTime = performance.now();
const result = await betService.createBet(data);
const duration = performance.now() - startTime;

logger.info('Operation completed', {
  operation: 'createBet',
  duration: `${duration}ms`,
  success: true
});
```

### Health Checks
```typescript
// Health check endpoint
export const healthCheck = async (req: Request, res: Response) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    blockchain: await checkBlockchain()
  };
  
  const healthy = Object.values(checks).every(check => check.status === 'healthy');
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks
  });
};
```

---

## Documentation Standards

### Code Documentation
```typescript
/**
 * Creates a new bet with validation and escrow setup
 * 
 * @param betData - The bet creation data
 * @param creatorId - ID of the user creating the bet
 * @returns Promise resolving to the created bet
 * 
 * @throws {ValidationError} When bet data is invalid
 * @throws {InsufficientFundsError} When creator lacks funds for escrow
 * @throws {BlockchainError} When smart contract interaction fails
 * 
 * @example
 * ```typescript
 * const bet = await createBet({
 *   title: "Will it rain tomorrow?",
 *   type: "binary",
 *   stakeMin: 10
 * }, "user-123");
 * ```
 */
export async function createBet(
  betData: CreateBetRequest, 
  creatorId: string
): Promise<Bet> {
  // Implementation
}
```

### API Documentation
Always update OpenAPI specification when modifying endpoints:
```yaml
# Update the existing openapi-spec.yaml
paths:
  /api/v2/bets:
    post:
      summary: Create a new bet
      description: |
        Creates a new bet with the specified parameters. 
        Automatically sets up blockchain escrow.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateBetRequest'
      responses:
        '201':
          description: Bet created successfully
```

### README Updates
Keep project README current with:
- Setup instructions
- API endpoints
- Testing procedures
- Deployment steps
- Troubleshooting guide

---

This engineering standard ensures that Cursor AI IDE operates within safe, tested, and maintainable development practices while building the Fan Club Z platform. All development should follow these guidelines to maintain code quality, security, and reliability.