BUN ?= bun

.PHONY: install fmt fmt-check lint typecheck test build check

install:
	$(BUN) install

fmt:
	$(BUN) run format

fmt-check:
	$(BUN) run format:check

lint:
	$(BUN) run lint

typecheck:
	$(BUN) run typecheck

test:
	$(BUN) run test

build:
	$(BUN) run build

# Aggregate gate run by CI and mirrored by the pre-commit hook (lefthook.yml).
check: fmt-check lint typecheck test build
