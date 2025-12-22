# Release Process

This document describes how to release a new version of the `@opencode/webhook-plugin` package.

## Prerequisites

1. **NPM Account**: You need an npm account with publish access to the `@opencode` scope
2. **GitHub Permissions**: You need write access to the repository
3. **Secrets Configured**: Ensure `NPM_TOKEN` is configured in GitHub repository secrets

## Release Steps

### 1. Update Version

Update the version in `package.json`:

```bash
# For a patch release (1.0.0 -> 1.0.1)
npm version patch

# For a minor release (1.0.0 -> 1.1.0)
npm version minor

# For a major release (1.0.0 -> 2.0.0)
npm version major
```

This will:
- Update version in `package.json`
- Create a git commit with the version bump
- Create a git tag (e.g., `v1.0.1`)

### 2. Push Changes and Tags

```bash
# Push the commit
git push

# Push the tag
git push --tags
```

### 3. Create GitHub Release

1. Go to the [Releases page](https://github.com/zenibako/opencode-webhooks/releases)
2. Click "Draft a new release"
3. Select the tag you just pushed (e.g., `v1.0.1`)
4. Set the release title (e.g., `v1.0.1`)
5. Add release notes describing changes
6. Click "Publish release"

### 4. Automated Workflow

Once you publish the GitHub release, the automated workflow will:

1. ✅ **Verify version** - Ensures package.json version matches release tag
2. ✅ **Run quality checks**:
   - Lint the code
   - Run all tests with coverage
3. ✅ **Build the package**:
   - Compile TypeScript
   - Create npm package
4. ✅ **Publish to npm**:
   - Publish with provenance
   - Verify package on npm registry
5. ✅ **Upload release assets**:
   - Upload npm package tarball
   - Upload source archive
6. ✅ **Create summary** - Generate detailed release summary

### 5. Verify Release

After the workflow completes:

1. Check the [npm package page](https://www.npmjs.com/package/@opencode/webhook-plugin)
2. Verify the new version is available
3. Test installation:
   ```bash
   npm install @opencode/webhook-plugin@latest
   ```

## Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features, backwards compatible
- **PATCH** (0.0.x): Bug fixes, backwards compatible

## Pre-release Versions

For beta or alpha releases:

```bash
# Create a beta version
npm version prerelease --preid=beta
# Results in: 1.0.1-beta.0

# Create an alpha version
npm version prerelease --preid=alpha
# Results in: 1.0.1-alpha.0
```

Pre-release versions can be published with a tag:

```bash
npm publish --tag beta
```

## Manual Publishing (Emergency)

If the automated workflow fails, you can publish manually:

```bash
# Ensure you're logged in
npm login

# Build the project
npm run build

# Publish
npm publish --access public
```

## Troubleshooting

### Version Mismatch Error

If you get a version mismatch error:
- Ensure `package.json` version matches the release tag
- Tags should be in format `v1.0.0` (with 'v' prefix)
- Package version should be `1.0.0` (without 'v' prefix)

### NPM Token Issues

If publishing fails due to authentication:
1. Generate a new npm token with publish access
2. Update the `NPM_TOKEN` secret in GitHub repository settings
3. Re-run the workflow

### Package Already Exists

You cannot republish the same version. You must:
1. Bump the version
2. Create a new release

## Rollback

If you need to rollback a release:

```bash
# Deprecate the bad version
npm deprecate @opencode/webhook-plugin@1.0.1 "This version has critical bugs, use 1.0.2 instead"

# Publish a new fixed version
npm version patch
# ... follow release steps
```

**Note**: You cannot unpublish versions that are older than 24 hours.

## Checking Release Status

### NPM Registry

```bash
# View package info
npm view @opencode/webhook-plugin

# View specific version
npm view @opencode/webhook-plugin@1.0.1

# View all versions
npm view @opencode/webhook-plugin versions
```

### GitHub Actions

1. Go to [Actions tab](https://github.com/zenibako/opencode-webhooks/actions)
2. Select the "Release" workflow
3. View logs for the release run

## Release Checklist

Before releasing:

- [ ] All tests pass locally (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md is updated (if you maintain one)
- [ ] Documentation is up to date
- [ ] Version number follows semver
- [ ] Release notes are prepared

After releasing:

- [ ] Verify package on npm
- [ ] Test installation in a fresh project
- [ ] Check GitHub release page
- [ ] Announce release (if applicable)
