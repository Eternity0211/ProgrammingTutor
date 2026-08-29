# AGENTS.md

## Development Commands
- `npm run build`: Build the project.
- `npm run test`: Run all tests.
- `npm run lint`: Lint the codebase.
- `npm run typecheck`: Typecheck the codebase.
- `npm run dev`: Start the development server.

## Project Structure
- `src/`: Contains the main application code.
- `tests/`: Contains unit and integration tests.
- `scripts/`: Contains build and deployment scripts.

## Testing
- Run a single test file: `npm test -- --testPathPattern=<filename>`
- Run tests in watch mode: `npm test -- --watch`

## Linting and Formatting
- Fix linting issues: `npm run lint:fix`
- Format code: `npm run format`

## CI/CD
- CI workflows are defined in `.github/workflows/`
- Pre-commit hooks are defined in `husky/pre-commit`

## Environment Variables
- `.env.example`: Example environment variables.
- `.env`: Actual environment variables (not committed).

## Additional Notes
- Ensure `node_modules` is installed before running any commands.
- Use `yarn` or `npm` consistently throughout the project.
- Always commit changes after running `npm run lint` and `npm run typecheck`.
