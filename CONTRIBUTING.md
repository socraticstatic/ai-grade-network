# Contributing to AT&T NetBond SDCI

Thank you for your interest in contributing to AT&T NetBond SDCI! This document provides guidelines and information for contributors.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/att-netbond-sdci.git
   cd att-netbond-sdci
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### 1. Branch Strategy
- `main` - Production-ready code, auto-deploys to GitHub Pages
- `develop` - Development branch for feature integration
- Feature branches: `feature/feature-name`
- Bugfix branches: `bugfix/bug-name`

### 2. Making Changes
1. Create a new branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding standards below

3. Test your changes:
   ```bash
   npm run test
   npm run test:a11y
   npm run lint
   ```

4. Commit your changes:
   ```bash
   git commit -m "feat: add new feature description"
   ```

5. Push to your branch:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a Pull Request to `develop` branch

### 3. Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Coding Standards

### 1. Code Organization
- **File Structure**: Follow the established modular architecture
- **Component Size**: Keep components under 200 lines when possible
- **Separation of Concerns**: Each file should have a single responsibility

### 2. TypeScript
- Use strict TypeScript - no `any` types unless absolutely necessary
- Define interfaces for all props and complex objects
- Use proper import/export statements

### 3. React Best Practices
- Use functional components with hooks
- Implement proper error boundaries
- Use memo() for performance optimization when needed
- Follow the established pattern for lazy loading

### 4. Styling
- Use Tailwind CSS classes following the design system
- Follow the button rounding rules (rounded-full except for navigation)
- Maintain consistent 8px spacing system
- Ensure WCAG 2.1 AA accessibility compliance

### 5. Performance
- Lazy load components when appropriate
- Optimize bundle size following the established patterns
- Use proper React.memo() and useMemo() optimizations

## Testing

### 1. Unit Tests
- Write tests for all new components and utilities
- Follow the existing test patterns in the codebase
- Aim for high test coverage on critical paths

### 2. Accessibility Testing
- Run accessibility tests: `npm run test:a11y`
- Test keyboard navigation manually
- Verify screen reader compatibility

### 3. Performance Testing
- Monitor bundle size with `npm run build:analyze`
- Test on various devices and connection speeds

## Design Guidelines

### 1. Design System Compliance
- Follow the established design tokens in `/src/styles/tokens.css`
- Use the predefined color system and spacing
- Maintain visual hierarchy principles

### 2. Accessibility
- Ensure 4.5:1 color contrast ratio minimum
- Provide proper ARIA labels and roles
- Support keyboard navigation

### 3. Responsive Design
- Design mobile-first
- Test on various screen sizes
- Use appropriate breakpoints

## Pull Request Process

1. **PR Title**: Use conventional commit format
2. **Description**: Clearly describe changes and reasoning
3. **Testing**: Include testing evidence
4. **Screenshots**: Add screenshots for UI changes
5. **Review**: Address all review comments
6. **Accessibility**: Confirm accessibility requirements are met

## Code Review Guidelines

### For Reviewers
- Check code quality and maintainability
- Verify accessibility compliance
- Test functionality manually
- Provide constructive feedback

### For Authors
- Respond to all review comments
- Make requested changes promptly
- Verify CI/CD pipeline passes

## Release Process

1. **Feature Complete**: All features tested and reviewed
2. **QA Testing**: Comprehensive testing on staging environment
3. **Documentation**: Update relevant documentation
4. **Release Notes**: Document changes for users
5. **Deploy**: Merge to main triggers automatic deployment

## Getting Help

- **Documentation**: Check existing docs and README files
- **Issues**: Search existing issues before creating new ones
- **Discussion**: Use GitHub Discussions for questions
- **Contact**: Reach out to maintainers for urgent matters

## License

By contributing to AT&T NetBond SDCI, you agree that your contributions will be licensed under the same license as the project.

## Acknowledgments

Thank you for contributing to AT&T NetBond SDCI! Your efforts help make this project better for everyone.