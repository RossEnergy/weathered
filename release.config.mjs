/**
 * Semantic Release Configuration
 *
 * This configuration supports dual publishing:
 * - Custom name: Set CI_NPM_CUSTOM_NAME to publish under alternate package name
 * - Custom registry: Set CI_NPM_CUSTOM_REGISTRY to publish to alternate registry
 * - Custom access: Set CI_NPM_ACCESS to 'public' or 'private' (defaults to 'private')
 * - Default: Publishes as weathered to public npm registry
 *
 * All configuration (package.json and .npmrc) happens here for consistency across manual and CI processes.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const pkgName = process.env.CI_NPM_CUSTOM_NAME;
const pkgRegistry = process.env.CI_NPM_CUSTOM_REGISTRY;
const customAccess = process.env.CI_NPM_ACCESS || "private";

if (pkgRegistry) {
  // Create .npmrc if custom registry is specified
  const NPM_TOKEN = process.env.NPM_TOKEN;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const scopeMatch = `${pkgName || ""}`.match(/^@([^/]+)/);
  // use the github token if publishing to github package registry
  const token =
    pkgRegistry == "https://npm.pkg.github.com" ? GITHUB_TOKEN : NPM_TOKEN;

  console.log(
    "NPM_TOKEN for .npmrc is:",
    token.slice(0, 4) + "..." + token.slice(-4)
  );

  const npmrc = `${pkgRegistry
    .replace(/^https?:\/\//, "//")
    .replace(/\/$/, "")}/:_authToken=${token}
  ${scopeMatch ? `@${scopeMatch[1]}:registry=${pkgRegistry}\n` : ""}`;

  fs.writeFileSync(".npmrc", npmrc);
  console.log("Created .npmrc for custom registry\n", npmrc);
}

/* 
 By default, semantic-release will prioritize package.json repository field. semantic-release 
 only considers branches that are in the repository defined in the repositoryUrl for release. 
 branches in the config which do not exist in that repository will be ignored. 
 leading to errors like

  ```
    This test run was triggered on the branch feat/semantic-release, while semantic-release 
    is configured to only publish from master, therefore a new version won’t be published
  ```

  even when those branches do exist in the semantic-release config.

  To avoid this, we attempt to derive the repositoryUrl from git origin directly if not set in 
  package.json or environment variables.
*/

let repositoryUrl = undefined;
if (!repositoryUrl) {
  try {
    repositoryUrl = execSync("git config --get remote.origin.url", {
      encoding: "utf8",
    }).trim();
  } catch (_) {
    // leave undefined; semantic-release will surface a clear error if needed
  }
}

// update package.json for custom name/registry if needed
if (pkgName || pkgRegistry) {
  const pkg = JSON.parse(fs.readFileSync("package.json"));
  if (!pkg.publishConfig) pkg.publishConfig = {};
  pkg.publishConfig.access = customAccess;
  pkgName && (pkg.name = pkgName);
  pkgRegistry && (pkg.publishConfig.registry = pkgRegistry);
  pkg.repository = repositoryUrl;
  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
  console.log("Configured package for publishing");
}

console.log("Loading .releaserc.js configuration");
console.log("Custom name:", pkgName);
console.log("Custom registry:", pkgRegistry);
console.log("Repository URL:", repositoryUrl);

const config = {
  branches: ["master"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    ["@semantic-release/github", { successComment: false, failComment: false }],
  ],
};
export default config;
