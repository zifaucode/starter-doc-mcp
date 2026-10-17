import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface WrittenFile {
  fileName: string;
  filePath: string;
  bytes: number;
}

export async function writeMarkdownFiles(
  outputDir: string,
  files: Record<string, string>
): Promise<WrittenFile[]> {
  const resolvedDir = path.resolve(outputDir);
  await fs.mkdir(resolvedDir, { recursive: true });

  const written: WrittenFile[] = [];

  for (const [fileName, content] of Object.entries(files)) {
    const fullPath = path.join(resolvedDir, fileName);
    const buffer = Buffer.from(content, "utf-8");
    await fs.writeFile(fullPath, buffer);
    written.push({
      fileName,
      filePath: fullPath,
      bytes: buffer.byteLength
    });
  }

  return written;
}
