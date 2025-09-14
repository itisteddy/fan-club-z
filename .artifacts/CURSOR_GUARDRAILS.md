# CURSOR GUARDRAILS - SAFETY RULES

## CRITICAL SAFETY RULES FOR CURSOR AI ASSISTANT

### DO NOT REFACTOR UNLESS EXPLICITLY ASKED
- Do NOT refactor files or rename symbols unless explicitly asked
- Do NOT change routing/UX/flows not listed in the task
- Do NOT reorganize code structure without explicit permission
- Do NOT rename variables, functions, or classes unless specifically requested

### COMMIT AND CHANGE MANAGEMENT
- Write changes in small commits with clear messages
- Log every step to .artifacts/STEP_LOG.md
- Always verify changes work before reporting success
- Test changes thoroughly before proceeding

### BRANCH PROTECTION
- Main branch is protected - use develop branch for work
- Never push to main unless explicitly told to
- Always confirm before pushing to production
- Use feature branches for major changes

### VERSION MANAGEMENT
- Never hardcode version numbers
- Always read version from package.json
- Audit all files for hardcoded version references
- Increment version with each deployment

### DATA AND TESTING
- Use real data from database, not mock/placeholder data
- Always run tests before reporting success
- Follow mobile-first approach for UI changes
- Consider both light and dark modes for UI changes

### ARCHITECTURE COMPLIANCE
- Follow best practice software development architecture
- Maintain consistent authgate UI/UX design
- Avoid creating redundant new files
- Perform thorough investigation when fixing issues

## ENFORCEMENT
These guardrails are active and must be followed. Any deviation requires explicit user permission.
