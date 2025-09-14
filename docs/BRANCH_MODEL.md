# Branch Model Documentation

## Overview
Fan Club Z follows a Git Flow-based branch model for organized development and release management.

## Branch Types

### 1. Main Branch (`main`)
- **Purpose**: Production-ready code
- **Protection**: Protected branch (requires PR reviews)
- **Merging**: Only from `develop` or `hotfix/*` branches
- **Deployment**: Automatically deploys to production

### 2. Develop Branch (`develop`)
- **Purpose**: Integration branch for features
- **Protection**: Protected branch (requires PR reviews)
- **Merging**: From `feature/*` branches
- **Deployment**: Automatically deploys to staging

### 3. Feature Branches (`feature/*`)
- **Purpose**: New features and enhancements
- **Naming**: `feature/description` (e.g., `feature/content-first-auth`)
- **Source**: Branch from `develop`
- **Target**: Merge to `develop` via PR
- **Examples**:
  - `feature/content-first-auth`
  - `feature/live-stats-refresh`
  - `feature/comments-threading`

### 4. Hotfix Branches (`hotfix/*`)
- **Purpose**: Critical production fixes
- **Naming**: `hotfix/description` (e.g., `hotfix/auth-bug`)
- **Source**: Branch from `main`
- **Target**: Merge to both `main` and `develop`
- **Examples**:
  - `hotfix/content-first-auth-v2.0.77`
  - `hotfix/batch-3b-headers-currency-comments`

### 5. Release Branches (`release/vX.Y.Z`)
- **Purpose**: Release preparation and final testing
- **Naming**: `release/vX.Y.Z` (e.g., `release/v2.0.77`)
- **Source**: Branch from `develop`
- **Target**: Merge to `main` and back to `develop`
- **Examples**:
  - `release/v2.0.77`
  - `release/ts-zero-and-prod-2.0.77`

### 6. Chore Branches (`chore/*`)
- **Purpose**: Maintenance, refactoring, and tooling updates
- **Naming**: `chore/description` (e.g., `chore/release-hygiene`)
- **Source**: Branch from `develop`
- **Target**: Merge to `develop` via PR
- **Examples**:
  - `chore/release-hygiene`
  - `chore/types-and-logging-hardening`

## Branch Protection Rules

### Main Branch Protection
- Require pull request reviews (2 reviewers)
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Restrict pushes that create files larger than 100MB
- Require linear history

### Develop Branch Protection
- Require pull request reviews (1 reviewer)
- Require status checks to pass before merging
- Require branches to be up to date before merging

## Workflow

### Feature Development
1. Create feature branch from `develop`
2. Develop and test feature
3. Create PR to `develop`
4. After review and approval, merge to `develop`
5. Delete feature branch

### Hotfix Process
1. Create hotfix branch from `main`
2. Fix critical issue
3. Create PR to `main`
4. After review and approval, merge to `main`
5. Create PR from `main` to `develop`
6. Merge to `develop`
7. Delete hotfix branch

### Release Process
1. Create release branch from `develop`
2. Final testing and bug fixes
3. Version bump and changelog updates
4. Create PR to `main`
5. After approval, merge to `main` (creates release)
6. Create PR from `main` to `develop`
7. Merge to `develop`
8. Delete release branch

## Naming Conventions

### Branch Names
- Use lowercase with hyphens: `feature/user-authentication`
- Be descriptive but concise
- Include issue number if applicable: `feature/123-user-profile`

### Commit Messages
- Use conventional commits format
- Prefix with type: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- Examples:
  - `feat: add content-first authentication`
  - `fix: resolve TypeScript compilation errors`
  - `chore: update dependencies and tooling`

## Best Practices

### Before Creating a Branch
1. Ensure you're on the latest `develop` branch
2. Pull latest changes: `git pull origin develop`
3. Create and switch to new branch: `git checkout -b feature/description`

### During Development
1. Make small, focused commits
2. Write descriptive commit messages
3. Keep branch up to date with `develop`
4. Test your changes thoroughly

### Before Creating PR
1. Run all tests: `npm run test`
2. Run linting: `npm run lint`
3. Run type checking: `npm run typecheck`
4. Ensure all CI checks pass
5. Update documentation if needed

### PR Requirements
1. Descriptive title and description
2. Link to related issues
3. Include screenshots for UI changes
4. Ensure all checklist items are completed
5. Request appropriate reviewers

## Emergency Procedures

### Critical Production Issues
1. Create hotfix branch from `main`
2. Implement minimal fix
3. Test thoroughly
4. Create PR to `main` with high priority
5. Deploy immediately after merge
6. Create follow-up PR to `develop`

### Rollback Procedures
1. Identify last known good commit
2. Create hotfix branch from `main`
3. Revert problematic changes
4. Test rollback
5. Deploy rollback
6. Document incident and lessons learned
