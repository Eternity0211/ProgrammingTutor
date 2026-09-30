import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const metadataPath = path.join(
  root,
  "data",
  "exercises",
  "leetcode-catalog.metadata.json",
);
const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
const catalogPath = path.join(root, metadata.catalog);
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const errors = [];

if (!/^\d{4}\.\d{2}\.\d{2}-v\d+$/.test(metadata.version)) {
  errors.push(`invalid catalog version: ${metadata.version}`);
}
if (!Array.isArray(catalog)) errors.push("catalog must be an array");
if (catalog.length < metadata.minimumTotalItems) {
  errors.push(
    `catalog has ${catalog.length} items; expected at least ${metadata.minimumTotalItems}`,
  );
}

const ids = new Set();
const urls = new Set();
const topicCounts = new Map();
const allowedFields = new Set(["id", "title", "difficulty", "topic", "url"]);
for (const [index, item] of catalog.entries()) {
  const label = `item ${index + 1}`;
  for (const field of Object.keys(item)) {
    if (!allowedFields.has(field)) errors.push(`${label} has unknown ${field}`);
  }
  for (const field of ["id", "title", "difficulty", "topic", "url"]) {
    if (typeof item[field] !== "string" || item[field].trim() === "") {
      errors.push(`${label} has invalid ${field}`);
    }
  }
  if (ids.has(item.id)) errors.push(`duplicate id: ${item.id}`);
  if (urls.has(item.url)) errors.push(`duplicate url: ${item.url}`);
  ids.add(item.id);
  urls.add(item.url);

  if (!metadata.allowedDifficulties.includes(item.difficulty)) {
    errors.push(`${item.id} has unsupported difficulty: ${item.difficulty}`);
  }
  if (!metadata.requiredTopics.includes(item.topic)) {
    errors.push(`${item.id} has unsupported topic: ${item.topic}`);
  }
  try {
    const url = new URL(item.url);
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      url.protocol !== "https:" ||
      !["leetcode.cn", "www.leetcode.cn"].includes(url.hostname) ||
      segments[0] !== "problems" ||
      !segments[1]
    ) {
      errors.push(`${item.id} has an untrusted problem URL`);
    }
  } catch {
    errors.push(`${item.id} has an invalid URL`);
  }
  topicCounts.set(item.topic, (topicCounts.get(item.topic) ?? 0) + 1);
}

for (const topic of metadata.requiredTopics) {
  const count = topicCounts.get(topic) ?? 0;
  if (count < metadata.minimumItemsPerTopic) {
    errors.push(
      `${topic} has ${count} items; expected at least ${metadata.minimumItemsPerTopic}`,
    );
  }
}

if (errors.length > 0) {
  console.error(`Exercise catalog validation failed (${metadata.version}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const coverage = metadata.requiredTopics
    .map((topic) => `${topic}=${topicCounts.get(topic)}`)
    .join(", ");
  console.log(
    `Exercise catalog ${metadata.version} is valid: ${catalog.length} items (${coverage}).`,
  );
}
