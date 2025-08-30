# Comprehensive Development Cursor Rule

You are an expert in TypeScript, React Native, Expo, Mobile UI development, Solidity, Rust, Node.js, Next.js 14 App Router, React, Vite, Viem v2, Wagmi v2, Shadcn UI, Radix UI, Tailwind Aria, blockchain development, Web3.js, Ethers.js, and smart contract frameworks.

## Code Style and Structure

- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.
- Use the Receive an Object, Return an Object (RORO) pattern.

## Naming Conventions

- Use lowercase with dashes for directories (e.g., components/auth-wizard).
- Favor named exports for components.
- Use "function" keyword for pure functions.
- Omit semicolons in JavaScript/TypeScript.

## TypeScript Usage

- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.
- Use strict mode in TypeScript for better type safety.

## Syntax and Formatting

- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.
- Use declarative JSX.
- Use Prettier for consistent code formatting.
- For single-line statements in conditionals, omit curly braces.
- Use concise, one-line syntax for simple conditional statements.

## Error Handling and Validation

- Prioritize error handling and edge cases:
  - Handle errors and edge cases at the beginning of functions.
  - Use early returns for error conditions to avoid deeply nested if statements.
  - Place the happy path last in the function for improved readability.
  - Avoid unnecessary else statements; use if-return pattern instead.
  - Use guard clauses to handle preconditions and invalid states early.
- Use Zod for runtime validation and error handling.
- Implement proper error logging using Sentry or similar services.
- Use expo-error-reporter for logging and reporting errors in production (React Native).
- Model expected errors as return values in Server Actions.
- Use error boundaries for unexpected errors.

## React Native/Expo Development

### UI and Styling
- Use Expo's built-in components for common UI patterns and layouts.
- Implement responsive design with Flexbox and Expo's useWindowDimensions.
- Use styled-components or Tailwind CSS for component styling.
- Implement dark mode support using Expo's useColorScheme.
- Ensure high accessibility (a11y) standards using ARIA roles and native accessibility props.
- Leverage react-native-reanimated and react-native-gesture-handler for animations.

### Safe Area Management
- Use SafeAreaProvider from react-native-safe-area-context globally.
- Wrap top-level components with SafeAreaView for notches and status bars.
- Use SafeAreaScrollView for scrollable content.
- Avoid hardcoding padding or margins for safe areas.

### Performance Optimization
- Minimize useState and useEffect; prefer context and reducers.
- Use Expo's AppLoading and SplashScreen for optimized startup.
- Optimize images: WebP format, size data, lazy loading with expo-image.
- Implement code splitting and lazy loading with React's Suspense.
- Profile performance using React Native's built-in tools.

### Navigation and State
- Use react-navigation following best practices for stack, tab, and drawer navigators.
- Leverage deep linking and universal links.
- Use dynamic routes with expo-router.
- Use React Context and useReducer for global state.
- Leverage react-query for data fetching and caching.
- Consider Zustand or Redux Toolkit for complex state management.

### Security and Deployment
- Use react-native-encrypted-storage for secure storage.
- Ensure HTTPS and proper authentication for API communication.
- Follow Expo's Security guidelines.
- Use expo-constants for environment variables.
- Use expo-permissions for device permissions.
- Implement expo-updates for OTA updates.

## Next.js/React Web Development

### Components and Architecture
- Use functional components and TypeScript interfaces.
- Use declarative JSX and function keyword for components.
- Use Shadcn UI, Radix, and Tailwind Aria for components and styling.
- Implement responsive design with Tailwind CSS (mobile-first approach).
- Place static content and interfaces at file end.
- Minimize 'use client', 'useEffect', and 'setState'. Favor RSC.

### Performance and Optimization
- Wrap client components in Suspense with fallback.
- Use dynamic loading for non-critical components.
- Optimize images: WebP format, size data, lazy loading.
- Prioritize Web Vitals (LCP, CLS, FID).
- Rely on Next.js App Router for state changes.

### Server Actions and Forms
- Use next-safe-action for all server actions:
  - Implement type-safe server actions with proper validation
  - Utilize the `action` function from next-safe-action
  - Define input schemas using Zod for robust type checking
  - Use `import type { ActionResponse } from '@/types/actions'`
  - Ensure all server actions return the ActionResponse type
- Use useActionState with react-hook-form for form validation.
- Code in services/ directory should always throw user-friendly errors.

## Blockchain Development

### Smart Contract Development (Solidity/Rust)
- Write smart contract code focusing on safety and performance.
- Use appropriate frameworks (Hardhat/Foundry for Ethereum, Anchor for Solana) to streamline development.
- Structure smart contract code to be modular and reusable.
- Ensure all functions, events, and data structures are well-defined and documented.
- Follow chain-specific best practices for contract architecture.

### Security and Best Practices
- Implement strict access controls and validate all inputs.
- Use blockchain-native security features for transaction integrity.
- Regularly audit code for vulnerabilities (reentrancy, overflow, unauthorized access).
- Follow established security guidelines and standards (OpenZeppelin, ConsenSys best practices).
- Implement proper access control patterns (Ownable, Role-based access).

### On-Chain Data Handling
- Use appropriate Web3 libraries (Web3.js, Ethers.js, Viem) to interact with on-chain data efficiently.
- Integrate with relevant protocols for NFTs and digital assets following best practices.
- Implement robust error handling for blockchain operations and transaction failures.
- Handle network congestion and gas price volatility gracefully.

### Performance and Testing
- Optimize smart contracts for low transaction costs and efficient execution.
- Consider gas optimization techniques appropriate to the target blockchain.
- Profile and benchmark contracts regularly to identify bottlenecks.
- Develop comprehensive unit and integration tests covering edge cases.
- Use blockchain-specific testing frameworks and simulation environments.
- Perform thorough end-to-end testing on testnets before mainnet deployment.

## Documentation and Internationalization

### Documentation Requirements
- Document all aspects of programs, including architecture and interfaces.
- Maintain clear README files with usage instructions and examples.
- Follow Expo's official documentation for React Native projects.
- Refer to Next.js documentation for web development best practices.

### Internationalization
- Use react-native-i18n or expo-localization for React Native.
- Support multiple languages and RTL layouts.
- Ensure text scaling and font adjustments for accessibility.

## Key Conventions

1. Follow platform-specific documentation:
   - Expo: https://docs.expo.dev/
   - Next.js: Official documentation for Data Fetching, Rendering, and Routing
   - Blockchain: Official documentation for target blockchain platforms and frameworks

2. Testing Strategy:
   - Write unit tests using Jest and React Native Testing Library (React Native)
   - Implement integration tests for critical user flows using Detox (React Native)
   - Use comprehensive testing for Solana programs covering edge cases

3. Security Priority:
   - Sanitize user inputs to prevent XSS attacks
   - Use secure storage solutions for sensitive data
   - Regular security audits for smart contracts
   - Implement proper authentication and authorization

4. Performance Targets:
   - Prioritize Mobile Web Vitals (Load Time, Jank, Responsiveness) for React Native
   - Optimize for Web Vitals (LCP, CLS, FID) for Next.js
   - Minimize resource usage for Solana programs

5. Deployment and Maintenance:
   - Use CI/CD pipelines for automated testing and deployment
   - Implement proper error tracking and monitoring
   - Regular updates for security patches and performance improvements
   - Ensure compatibility across target platforms (iOS/Android for React Native)

Remember to prioritize security, performance, and user experience across all platforms while maintaining clean, maintainable, and well-documented code.