# Contributing to Blaaiz Node.js SDK

Thank you for considering contributing to the Blaaiz Node.js SDK! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/blaaiz-nodejs-sdk.git`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests (requires API key)
npm run test:integration
```

### Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run security audit
npm run audit
```

### Building

```bash
# Build the project (lint + test)
npm run build
```

## Code Style

- Follow the existing code style
- Use ESLint configuration provided
- Write meaningful commit messages
- Add tests for new functionality
- Update documentation when needed

## Pull Request Process

1. Ensure your code passes all tests and linting
2. Update the README.md if you've added new features
3. Update the TypeScript definitions if needed
4. Ensure all CI checks pass
5. Request a review from maintainers

## API Guidelines

- Follow existing naming conventions
- Use snake_case for API parameters (matching Blaaiz API)
- Use camelCase for JavaScript variables and methods
- Add proper error handling
- Include TypeScript type definitions

## Testing

- Write unit tests for all new functions
- Mock external dependencies
- Test both success and error scenarios
- Keep tests focused and readable

## Documentation

- Update README.md for new features
- Add JSDoc comments for new methods
- Include code examples in documentation
- Keep documentation up-to-date with code changes

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Provide detailed reproduction steps
- Include code samples when applicable
- Specify your environment (Node.js version, OS, etc.)

## Security

- Never commit API keys or secrets
- Report security vulnerabilities privately
- Use environment variables for sensitive data
- Follow security best practices

## Questions?

If you have questions about contributing, please:
1. Check existing issues and discussions
2. Create a new issue with the "question" label
3. Contact the maintainers

Thank you for your contributions! 🚀