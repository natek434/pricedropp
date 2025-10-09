# Resolving Git Merge Conflicts

When a pull request shows merge conflicts, you need to reconcile the competing changes between the target branch (usually `main`) and your feature branch. Use the following workflow to decide what to accept:

## 1. Inspect the conflicts locally

1. Checkout the branch from the pull request:
   ```bash
   git checkout <your-branch-name>
   ```
2. Pull the latest copy of the target branch and merge it locally so you can inspect the conflicts:
   ```bash
   git fetch origin
   git merge origin/main
   ```
   Git will stop at the first conflict and mark the files with conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).

## 2. Review each conflicted hunk

Open each conflicted file in your editor. For every block wrapped in conflict markers:

- The section between `<<<<<<< HEAD` and `=======` shows the version from the branch you are merging into (for example, `origin/main`).
- The section between `=======` and `>>>>>>> <branch>` shows the version from your branch.

Decide which parts to keep by comparing the intent of both changes:

- **Keep both changes** if they edit different concepts (e.g., one adds logging and the other adjusts validation). Manually compose a combined block without the conflict markers.
- **Choose one side** if the other is outdated or incorrect. Remove the unwanted block entirely.
- **Rewrite the section** if neither version is correct anymore. Craft the desired result manually, then remove the conflict markers.

Tip: Use `git diff --base <file>` to compare both sides against their common ancestor when you need more context.

## 3. Test your resolution

After resolving all conflicts and removing the markers:

```bash
git add <file> # repeat for each resolved file
git status     # confirm "all conflicts fixed" appears
```

Run the relevant test or build commands to ensure the merged result still works.

## 4. Finalize the merge

```bash
git commit
```

Push the updated branch and refresh the pull request. GitHub will re-run checks and confirm the conflicts are resolved.

If you need to restart, you can abort the merge safely:

```bash
git merge --abort
```

This restores your branch to its pre-merge state so you can try again.
