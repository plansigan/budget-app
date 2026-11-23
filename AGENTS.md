# Git Workflow Rules

## Pushing to `main` / `master`

When the user asks to push changes to `main` or `master` (for example, "go ahead and push" or "push it to main/master"), do not push directly to `main`/`master` and do not stop to ask whether to use a branch/PR. Instead, automatically complete the full PR flow:

1. Create and switch to a descriptive feature branch from `main`/`master` (e.g., `git checkout -b <type>/<short-name>`).
2. Stage and commit the relevant changes, then push the feature branch (`git push -u origin <branch>`).
3. Open a pull request targeting `main`/`master` via `gh pr create`.
4. Merge the PR (`gh pr merge --merge --delete-branch`, falling back to `--squash --delete-branch` if merge commits are disabled) and sync local `main`/`master` (`git checkout <base> && git pull origin <base>`).
