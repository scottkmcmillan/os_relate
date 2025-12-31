import fs from 'node:fs/promises';
import path from 'node:path';

export type IngestDoc = {
  title: string;
  text: string;
  source: string;
  tags?: string[];
  timestamp: number;
};

const TEXT_EXTS = new Set(['.md', '.txt']);

export async function readDocsFromPath(inputPath: string, tags?: string[]): Promise<IngestDoc[]> {
  const stat = await fs.stat(inputPath);

  if (stat.isDirectory()) {
    const entries = await fs.readdir(inputPath, { withFileTypes: true });
    const docs: IngestDoc[] = [];

    for (const entry of entries) {
      const full = path.join(inputPath, entry.name);
      if (entry.isDirectory()) {
        docs.push(...(await readDocsFromPath(full, tags)));
      } else {
        docs.push(...(await readDocsFromFile(full, tags)));
      }
    }

    return docs;
  }

  return readDocsFromFile(inputPath, tags);
}

async function readDocsFromFile(filePath: string, tags?: string[]): Promise<IngestDoc[]> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;

    // Supports either a single object or an array
    const items = Array.isArray(parsed) ? parsed : [parsed];

    return items
      .map((item) => normalizeJsonDoc(item, filePath, tags))
      .filter((d): d is IngestDoc => Boolean(d));
  }

  if (TEXT_EXTS.has(ext)) {
    const text = await fs.readFile(filePath, 'utf-8');
    return [
      {
        title: path.basename(filePath),
        text,
        source: filePath,
        tags,
        timestamp: Date.now()
      }
    ];
  }

  return [];
}

function normalizeJsonDoc(item: unknown, source: string, tags?: string[]): IngestDoc | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title : path.basename(source);

  // Try common keys produced by research tools
  const text =
    typeof obj.text === 'string'
      ? obj.text
      : typeof obj.content === 'string'
        ? obj.content
        : typeof obj.summary === 'string'
          ? obj.summary
          : typeof obj.query === 'string'
            ? obj.query
            : '';

  if (!text) return null;

  return {
    title,
    text,
    source,
    tags,
    timestamp: typeof obj.timestamp === 'number' ? obj.timestamp : Date.now()
  };
}
