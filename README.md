# arthurfiorette/action-auto-merge

Automatically enables GitHub auto-merge for Dependabot pull requests when the update is inside your configured semver target.

## Usage

```yaml
name: auto-merge

on:
  pull_request_target:

permissions:
  pull-requests: write

jobs:
  auto-merge:
    if: ${{ github.actor == 'dependabot[bot]' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: arthurfiorette/action-auto-merge@v1
        with:
          github-token: ${{ github.token }}
          target: patch
```

## Required repository setup

This action **enables auto-merge directly** (the same effect as clicking GitHub's auto-merge button).

You must configure branch protection/repository rules so:

1. Direct merges are blocked while CI is pending/failing.
2. Auto-merge is allowed when CI becomes green.

If the action detects pending checks and the pull request is still directly mergeable, it fails to signal missing repository protection setup.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `github-token` | ✅ | `${{ github.token }}` | GitHub token with `pull-requests: write` permission. |
| `target` | ❌ | `patch` | Maximum semver target for production dependencies (`patch`, `minor`, `major`, `prepatch`, `preminor`, `premajor`). |

## Notes

- Configuration files are no longer supported; behavior is controlled only through action inputs.
- The action is published as `arthurfiorette/action-auto-merge`.
