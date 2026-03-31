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
