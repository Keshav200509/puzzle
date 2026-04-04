# Deployment Workflow Notes

## Can code be pushed without creating branches?

Yes.


If repository settings allow it, contributors can push directly to `main`.

## Exact GitHub steps to enable direct push to `main`

### A) Give the contributor write access

1. Open your repository on GitHub.
2. Go to **Settings**.
3. Click **Collaborators and teams**.
4. Click **Add people** (or **Add teams**).
5. Select the user/team.
6. Set permission to **Write** (or **Maintain/Admin**).
7. Save.

### B) Check branch protection rules on `main`

1. Go to **Settings → Branches**.
2. Under **Branch protection rules**, find the rule that targets `main`.
3. Click **Edit**.
4. If you want direct pushes:
   - Turn off **Require a pull request before merging**, or
   - If kept on, ensure your user is listed in bypass allowances.
5. Ensure **Restrict who can push to matching branches** either:
   - is disabled, or
   - includes your user/team in allowed pushers.
6. Save changes.

### C) Check repository/organization rulesets

1. Go to **Settings → Rules → Rulesets**.
2. Open active ruleset(s) applied to `main`.
3. Verify there is no mandatory rule forcing PR-only merges for your actor.
4. If needed, add your user/team to **Bypass list** (if policy allows).
5. Save and publish the ruleset updates.

## Validate that direct push is now enabled

Run this from local repo:
If your repository permissions allow it, you can push directly to `main`.

Typical direct flow:

```bash
git checkout main
git pull origin main
git add .
git commit -m "test direct push permissions"
git push origin main
```

- If push succeeds: direct push is enabled.
- If rejected: read the remote error text; it will say whether branch protection or ruleset blocked it.

## Recommended safety checks before direct push

```bash
npm run lint
npm test
npm run build
```
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
