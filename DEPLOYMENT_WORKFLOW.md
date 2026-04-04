# Deployment Workflow Notes

## Can code be pushed without creating branches?

Yes.

If repository settings allow it, contributors can push directly to `main`.

## Permissions that must be enabled (GitHub)

To allow direct pushes to `main`, an org/repo admin should ensure:

1. The user has **Write** (or higher) repository permission.
2. Branch protection on `main` does **not** require pull requests.
3. Branch protection on `main` does **not** block direct pushes for that user/team.
4. Rulesets (if configured) do not enforce PR-only merges on `main`.

### Where to configure

- **Repo permissions**: `Settings → Collaborators and teams`
- **Branch rules**: `Settings → Branches`
- **Rulesets** (new policy engine): `Settings → Rules → Rulesets`

## Direct-push workflow (no feature branch)

```bash
git checkout main
git pull origin main
git add .
git commit -m "your change"
git push origin main
```

## Recommended safety checks before push

```bash
npm run lint
npm test
npm run build
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
