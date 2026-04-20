const branch = process.env.GITHUB_REF_NAME || "";

module.exports = {
  branches: [
    "master",
    { name: "saason", prerelease: "dev" },
  ],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/npm", { npmPublish: branch === "master" }],
    [
      "@semantic-release/exec",
      {
        publishCmd: "./scripts/dockerBuildPush.sh ${nextRelease.version}",
      },
    ],
    [
      "@semantic-release/github",
      {
        addReleases: "top",
        // Upstream merges (e.g. jagregory/cognito-local TOTP MFA #469) carry "(#NNN)" PR
        // references in their commit messages. semantic-release's success step would try to
        // comment on / label those PR numbers in *this* repo and 404 because they belong to
        // upstream. Disable PR/issue comments and labels to keep cross-repo syncs publishable.
        successComment: false,
        failComment: false,
        releasedLabels: false,
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md"],
      },
    ],
  ],
};
