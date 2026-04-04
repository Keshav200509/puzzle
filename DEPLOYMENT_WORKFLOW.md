# Deployment Workflow Notes

## Can code be pushed without creating branches?

Yes.

If your repository permissions allow it, you can push directly to `main`.

Typical direct flow:

```bash
git checkout main
git pull origin main
git add .
git commit -m "your change"
git push origin main
```

## Why teams still use branches

Even though direct push is possible, branches are usually preferred because they provide:

- safer reviews before release,
- easier rollback/isolation of incomplete work,
- CI checks before merge,
- cleaner collaboration with multiple contributors.

## Practical recommendation for this project

- For urgent hotfixes: direct push to `main` can be used.
- For normal feature work: use feature branches + PR review.

This balances speed and stability.
