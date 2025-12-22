# Publishing Guide

## Pre-publish Checklist

Before publishing to npm, ensure:

1. ✅ All tests pass: `npm test`
2. ✅ Build succeeds: `npm run build`
3. ✅ Version updated in `package.json`
4. ✅ `CHANGELOG.md` updated with changes
5. ✅ Changes committed to git
6. ✅ Package contents verified: `npm pack --dry-run`

## Publishing Steps

### 1. Commit Your Changes

```bash
# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "Release v2.0.0 - Modernize with ES6+, Rollup, comprehensive tests"

# Push to GitHub
git push origin master
```

### 2. Create a Git Tag

```bash
# Create an annotated tag
git tag -a v2.0.0 -m "Version 2.0.0 - ES6+ modernization"

# Push the tag
git push origin v2.0.0
```

### 3. Publish to NPM

First, ensure you're logged in to npm:

```bash
npm login
```

Then publish the package:

```bash
# For a public package
npm publish

# If you need to publish with public access explicitly
npm publish --access public
```

### 4. Verify the Publication

```bash
# Check the published package info
npm info jq-repeat

# View the package on npm
open https://www.npmjs.com/package/jq-repeat
```

## What Gets Published

The npm package includes:
- `dist/` - Built JavaScript files (minified and unminified)
- `src/` - Source files
- `README.md` - Documentation
- `LICENSE` - License file
- `package.json` - Package metadata

Excluded via `.npmignore`:
- `test/` - Test files
- `node_modules/` - Dependencies
- `.mocharc.json` - Test configuration
- `rollup.config.js` - Build configuration
- Development files and IDE configurations

## Post-publish

1. Create a GitHub Release:
   - Go to https://github.com/wmantly/jq-repeat/releases
   - Click "Draft a new release"
   - Select tag v2.0.0
   - Copy content from CHANGELOG.md
   - Publish release

2. Update any documentation sites or examples

3. Announce the release (optional):
   - Twitter
   - Reddit (r/javascript, r/webdev)
   - Dev.to blog post

## Troubleshooting

### "You must be logged in to publish packages"
Run `npm login` and enter your credentials.

### "You do not have permission to publish"
Ensure you're an owner/maintainer of the package. Check with `npm owner ls jq-repeat`.

### "Version already published"
Update the version number in `package.json` if you've already published this version.

### Failed prepublishOnly script
The build or tests failed. Fix the issues before publishing:
- `npm run build` to check build
- `npm test` to check tests

## Version Bump Guide

For future releases:

### Patch (2.0.1)
Bug fixes, no new features:
```bash
npm version patch
```

### Minor (2.1.0)
New features, backward compatible:
```bash
npm version minor
```

### Major (3.0.0)
Breaking changes:
```bash
npm version major
```

These commands automatically:
- Update package.json
- Create a git commit
- Create a git tag

Then push with: `git push && git push --tags`
