# Testing with Bun

## Test Commands

- Run unit tests: `bun run test:unit`
- Run with coverage: `bun run test:cov`
- Run in watch mode: `bun run test:watch`
- Run in debug mode: `bun run test:debug`

## Run Specific Test File

- Unit test: `bun run test:unit -- path/to/file.spec.ts`

## Notes

Only unit tests are run. Integration tests are not executed.
