import fs from 'node:fs/promises';
import path from 'node:path';
import { FSWatcher, watch } from 'node:fs';

/**
 * Configuration options for file reading operations
 */
export interface ReadOptions {
  /** File extensions to include (e.g., ['.md', '.txt']) */
  extensions?: string[];
  /** Directories to exclude from traversal */
  exclude?: string[];
  /** Maximum depth for recursive traversal (default: unlimited) */
  maxDepth?: number;
  /** Whether to follow symbolic links (default: false) */
  followSymlinks?: boolean;
}

/**
 * Metadata about a read file
 */
export interface FileMetadata {
  /** Absolute file path */
  path: string;
  /** File extension */
  extension: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  modified: Date;
  /** Relative path from the read root */
  relativePath: string;
}

/**
 * A file's content along with its metadata
 */
export interface FileContent {
  /** File metadata */
  metadata: FileMetadata;
  /** Raw file content as string */
  content: string;
}

/**
 * Callback for file changes during directory watching
 */
export type FileChangeCallback = (event: 'add' | 'change' | 'unlink', filePath: string) => void | Promise<void>;

/**
 * Default supported file extensions
 */
const DEFAULT_EXTENSIONS = ['.md', '.txt', '.json', '.jsonl'];

/**
 * Default excluded directories
 */
const DEFAULT_EXCLUDE = ['node_modules', '.git', 'dist', 'build', '.cache'];

/**
 * Recursively read all files from a given path
 *
 * @param inputPath - File or directory path to read from
 * @param options - Configuration options for the read operation
 * @returns Array of file contents with metadata
 *
 * @example
 * ```typescript
 * const files = await readFiles('/path/to/docs', {
 *   extensions: ['.md', '.txt'],
 *   exclude: ['drafts']
 * });
 * ```
 */
export async function readFiles(
  inputPath: string,
  options?: ReadOptions
): Promise<FileContent[]> {
  const opts = normalizeOptions(options);
  const absolutePath = path.resolve(inputPath);

  try {
    const stat = await fs.stat(absolutePath);

    if (stat.isFile()) {
      return await readSingleFile(absolutePath, absolutePath, opts);
    }

    if (stat.isDirectory()) {
      return await readDirectory(absolutePath, absolutePath, opts, 0);
    }

    return [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Path does not exist: ${inputPath}`);
    }
    throw error;
  }
}

/**
 * Watch a directory for file changes
 *
 * @param directoryPath - Directory to watch
 * @param callback - Function to call when files change
 * @param options - Configuration options for filtering watched files
 * @returns Cleanup function to stop watching
 *
 * @example
 * ```typescript
 * const stopWatching = await watchDirectory('/path/to/docs',
 *   async (event, filePath) => {
 *     console.log(`File ${event}: ${filePath}`);
 *   },
 *   { extensions: ['.md'] }
 * );
 *
 * // Later...
 * stopWatching();
 * ```
 */
export async function watchDirectory(
  directoryPath: string,
  callback: FileChangeCallback,
  options?: ReadOptions
): Promise<() => void> {
  const opts = normalizeOptions(options);
  const absolutePath = path.resolve(directoryPath);

  // Verify the directory exists
  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${directoryPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Directory does not exist: ${directoryPath}`);
    }
    throw error;
  }

  // Track files to detect additions vs changes
  const trackedFiles = new Set<string>();

  // Initial scan to populate tracked files
  const initialFiles = await readFiles(absolutePath, options);
  initialFiles.forEach(file => trackedFiles.add(file.metadata.path));

  // Setup recursive watcher
  const watcher: FSWatcher = watch(
    absolutePath,
    { recursive: true },
    async (eventType, filename) => {
      if (!filename) return;

      const filePath = path.join(absolutePath, filename);
      const ext = path.extname(filePath).toLowerCase();

      // Filter by extension
      if (!opts.extensions.includes(ext)) return;

      // Filter by excluded directories
      const relativePath = path.relative(absolutePath, filePath);
      if (isExcluded(relativePath, opts.exclude)) return;

      try {
        // Check if file exists
        const stat = await fs.stat(filePath);

        if (stat.isFile()) {
          const event = trackedFiles.has(filePath) ? 'change' : 'add';
          trackedFiles.add(filePath);
          await callback(event, filePath);
        }
      } catch (error) {
        // File was deleted
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          if (trackedFiles.has(filePath)) {
            trackedFiles.delete(filePath);
            await callback('unlink', filePath);
          }
        }
      }
    }
  );

  // Return cleanup function
  return () => {
    watcher.close();
  };
}

/**
 * Normalize and validate options
 */
function normalizeOptions(options?: ReadOptions): Required<ReadOptions> {
  return {
    extensions: options?.extensions || DEFAULT_EXTENSIONS,
    exclude: options?.exclude || DEFAULT_EXCLUDE,
    maxDepth: options?.maxDepth ?? Infinity,
    followSymlinks: options?.followSymlinks ?? false
  };
}

/**
 * Read a single file and return its content
 */
async function readSingleFile(
  filePath: string,
  rootPath: string,
  options: Required<ReadOptions>
): Promise<FileContent[]> {
  const ext = path.extname(filePath).toLowerCase();

  // Check extension filter
  if (!options.extensions.includes(ext)) {
    return [];
  }

  // Check if excluded
  const relativePath = path.relative(rootPath, filePath);
  if (isExcluded(relativePath, options.exclude)) {
    return [];
  }

  const stat = await fs.stat(filePath);
  const content = await fs.readFile(filePath, 'utf-8');

  return [{
    metadata: {
      path: filePath,
      extension: ext,
      size: stat.size,
      modified: stat.mtime,
      relativePath
    },
    content
  }];
}

/**
 * Recursively read all files in a directory
 */
async function readDirectory(
  dirPath: string,
  rootPath: string,
  options: Required<ReadOptions>,
  currentDepth: number
): Promise<FileContent[]> {
  // Check depth limit
  if (currentDepth >= options.maxDepth) {
    return [];
  }

  // Check if excluded
  const relativePath = path.relative(rootPath, dirPath);
  if (relativePath && isExcluded(relativePath, options.exclude)) {
    return [];
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results: FileContent[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      const subResults = await readDirectory(
        fullPath,
        rootPath,
        options,
        currentDepth + 1
      );
      results.push(...subResults);
    } else if (entry.isFile()) {
      // Process file
      const fileResults = await readSingleFile(fullPath, rootPath, options);
      results.push(...fileResults);
    } else if (entry.isSymbolicLink() && options.followSymlinks) {
      // Handle symlinks if enabled
      try {
        const realPath = await fs.realpath(fullPath);
        const stat = await fs.stat(realPath);

        if (stat.isFile()) {
          const fileResults = await readSingleFile(realPath, rootPath, options);
          results.push(...fileResults);
        } else if (stat.isDirectory()) {
          const subResults = await readDirectory(
            realPath,
            rootPath,
            options,
            currentDepth + 1
          );
          results.push(...subResults);
        }
      } catch {
        // Skip broken symlinks
        continue;
      }
    }
  }

  return results;
}

/**
 * Check if a path should be excluded
 */
function isExcluded(relativePath: string, excludePatterns: string[]): boolean {
  const pathParts = relativePath.split(path.sep);

  return excludePatterns.some(pattern => {
    // Check if any part of the path matches the exclude pattern
    return pathParts.some(part => part === pattern || part.startsWith(pattern));
  });
}
