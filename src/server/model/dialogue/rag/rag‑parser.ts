import fs from "fs/promises";
import path from "path";

export interface DocumentChunk {
  title: string | null;
  content: string;
  headingPath: string[]; // 标题层级路径，例如 ["C++基础","指针"]
  filePath: string;
}

/**
 * 简单markdown标题感知分块
 * 按 # ## ### 标题切分，每个块记住标题路径
 */
export async function parseMarkdownFile(fileAbsolutePath: string): Promise<DocumentChunk[]> {
  const raw = await fs.readFile(fileAbsolutePath, "utf-8");
  return parseMarkdown(raw, fileAbsolutePath);
}

export function parseMarkdown(mdText: string, filePath: string): DocumentChunk[] {
  const lines = mdText.split("\n");
  const chunks: DocumentChunk[] = [];

  const headingStack: string[] = [];
  let currentBlockLines: string[] = [];
  let currentBlockTitle: string | null = null;

  const pushChunk = () => {
    const content = currentBlockLines.join("\n").trim();
    if (content.length === 0) return;

    chunks.push({
      title: currentBlockTitle,
      content,
      headingPath: [...headingStack],
      filePath,
    });
    currentBlockLines = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6}) (.*)$/);
    if (headingMatch) {
      pushChunk();

      const sharp = headingMatch[1];
      const titleText = headingMatch[2].trim();
      const level = sharp.length;

      while (headingStack.length >= level) {
        headingStack.pop();
      }
      headingStack.push(titleText);

      currentBlockTitle = titleText;
    } else {
      currentBlockLines.push(line);
    }
  }
  // 把最后一块输出
  pushChunk();

  return chunks;
}

export async function scanMdDirectory(dirPath: string): Promise<DocumentChunk[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let allChunks: DocumentChunk[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const sub = await scanMdDirectory(fullPath);
      allChunks = allChunks.concat(sub);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const chunks = await parseMarkdownFile(fullPath);
      allChunks = allChunks.concat(chunks);
    }
  }
  return allChunks;
}
