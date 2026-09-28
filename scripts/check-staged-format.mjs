import { spawnSync } from "node:child_process";
import prettier from "prettier";

function runGit(args, encoding = "utf8") {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding,
    windowsHide: true,
  });
  if (result.status !== 0) {
    const message = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString("utf8")
      : result.stderr;
    throw new Error(message || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}

const names = runGit([
  "diff",
  "--cached",
  "--name-only",
  "--diff-filter=ACMR",
  "-z",
]);
const stagedFiles = names.split("\0").filter(Boolean);
const unformatted = [];

for (const file of stagedFiles) {
  const info = await prettier.getFileInfo(file, {
    ignorePath: ".prettierignore",
  });
  if (info.ignored || !info.inferredParser) continue;

  const stagedContent = runGit(["show", `:${file}`], null);
  const formatted = await prettier.check(stagedContent.toString("utf8"), {
    filepath: file,
  });
  if (!formatted) unformatted.push(file);
}

if (unformatted.length > 0) {
  console.error("The following staged files need Prettier formatting:");
  for (const file of unformatted) console.error(`- ${file}`);
  console.error(
    "Run `npm run format -- <file...>`, then stage the files again.",
  );
  process.exit(1);
}

console.log(`Prettier checked ${stagedFiles.length} staged file(s).`);
