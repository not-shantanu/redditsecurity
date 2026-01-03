# Contributing to Reddit Copilot

Thank you for your interest in contributing to Reddit Copilot! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/reddit-copilot.git
   cd reddit-copilot
   ```

3. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes** and test thoroughly

5. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

## Development Guidelines

### Code Style
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Follow the existing code structure

### Testing
- Test all new features thoroughly
- Test edge cases
- Ensure no breaking changes (or document them)
- Test the Chrome extension if making extension changes

### Commit Messages
- Use clear, descriptive commit messages
- Format: `type: description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat: add keyword filtering to Define Market page`
- `fix: resolve button click issue in Chrome extension`
- `docs: update installation instructions`

## Project Structure

- `app/` - Next.js app directory (pages and API routes)
- `components/` - React components
- `lib/` - Utility functions and helpers
- `chrome-extension/` - Chrome extension source code
- `supabase_migration.sql` - Database schema

## Areas for Contribution

- Bug fixes
- New features
- Documentation improvements
- UI/UX enhancements
- Performance optimizations
- Test coverage
- Chrome extension improvements

## Questions?

Open an issue on GitHub for questions or discussions about contributions.

