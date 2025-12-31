# Document Upload API Guide

## Overview

The Ranger API provides document upload capabilities with automatic chunking, embedding generation, and GNN-enhanced semantic indexing. All uploads must specify a target collection for organization.

## Uploading Documents

### Endpoint

```
POST /documents/upload
```

### Required Fields

The upload endpoint requires a `multipart/form-data` request with two fields:

1. **file** - The document file (`.md`, `.txt`, `.json`, or `.jsonl`)
2. **collection** - The name of the collection to store the document in

### Example: cURL Upload

```bash
# Upload a markdown file to an existing collection
curl -X POST http://localhost:3000/api/documents/upload \
  -F "file=@document.md" \
  -F "collection=my-docs"

# Upload to a new collection (will be auto-created)
curl -X POST http://localhost:3000/api/documents/upload \
  -F "file=@notes.txt" \
  -F "collection=personal-notes"
```

### Example: Node.js/JavaScript Upload

```javascript
const FormData = require('form-data');
const fs = require('fs');

async function uploadDocument(filePath, collectionName) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('collection', collectionName);

  const response = await fetch('http://localhost:3000/api/documents/upload', {
    method: 'POST',
    body: form
  });

  const job = await response.json();
  console.log('Upload job created:', job.jobId);
  return job;
}

// Usage
uploadDocument('./my-document.md', 'research-papers');
```

### Example: Python Upload

```python
import requests

def upload_document(file_path, collection_name):
    url = 'http://localhost:3000/api/documents/upload'

    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {'collection': collection_name}

        response = requests.post(url, files=files, data=data)
        job = response.json()
        print(f"Upload job created: {job['jobId']}")
        return job

# Usage
upload_document('document.txt', 'knowledge-base')
```

## Listing Available Collections

Before uploading, you can retrieve the list of existing collections:

### Get All Collections (Full Details)

```bash
curl http://localhost:3000/api/collections
```

Response:
```json
[
  {
    "name": "claude-flow-docs",
    "dimension": 384,
    "metric": "cosine",
    "vectorCount": 20,
    "documentCount": 5,
    "createdAt": "2025-12-26T18:09:22.472Z",
    "lastUpdated": "2025-12-26T18:29:25.078Z",
    "stats": {
      "avgSearchTime": 34.6,
      "queriesPerDay": 19,
      "gnnImprovement": 0
    }
  }
]
```

### Get Collection Names Only (Lightweight)

```bash
curl http://localhost:3000/api/collections/names
```

Response:
```json
{
  "names": ["claude-flow-docs", "test-collection", "test", "json-test"]
}
```

## Tracking Upload Progress

Upload processing happens asynchronously. Track progress using the job ID:

```bash
# Get job status
curl http://localhost:3000/api/documents/upload/{jobId}/status
```

Response:
```json
{
  "jobId": "job-a1b2c3d4",
  "status": "complete",
  "stage": "learning",
  "progress": 100,
  "vectorsAdded": 5,
  "createdAt": "2025-12-26T22:00:00.000Z",
  "completedAt": "2025-12-26T22:00:02.500Z"
}
```

### Job Statuses

- **queued** - Upload accepted, waiting to process
- **processing** - Currently being processed
- **complete** - Successfully uploaded and indexed
- **error** - Processing failed (check `error` field)

### Processing Stages

1. **parsing** - Reading and parsing file content
2. **chunking** - Splitting into semantic chunks
3. **embedding** - Generating vector embeddings
4. **inserting** - Storing in vector database
5. **learning** - GNN learning and optimization

## Error Handling

### Missing Collection Field

If you forget to specify a collection, you'll receive a helpful error:

```json
{
  "error": "Collection name is required in form field \"collection\". Available collections: claude-flow-docs, test-collection, test, json-test",
  "code": "MISSING_FIELD"
}
```

### Unsupported File Type

```json
{
  "error": "Unsupported file type: .pdf. Supported: .md, .txt, .json, .jsonl",
  "code": "UPLOAD_ERROR"
}
```

### File Too Large

```json
{
  "error": "File exceeds maximum size of 50MB",
  "code": "FILE_TOO_LARGE"
}
```

## Creating New Collections

Collections can be created automatically during upload or manually via the collections API:

```bash
# Create a collection manually
curl -X POST http://localhost:3000/api/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-new-collection",
    "dimension": 384,
    "metric": "cosine"
  }'
```

## Complete Upload Example Script

```javascript
#!/usr/bin/env node
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function getCollections() {
  const response = await fetch(`${API_BASE}/collections/names`);
  const data = await response.json();
  return data.names;
}

async function uploadDocument(filePath, collectionName) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('collection', collectionName);

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Upload failed: ${error.error}`);
  }

  return await response.json();
}

async function checkJobStatus(jobId) {
  const response = await fetch(`${API_BASE}/documents/upload/${jobId}/status`);
  return await response.json();
}

async function main() {
  const filePath = process.argv[2];
  const collection = process.argv[3];

  if (!filePath || !collection) {
    console.log('Usage: node upload.js <file-path> <collection-name>');
    console.log('\nAvailable collections:');
    const collections = await getCollections();
    collections.forEach(name => console.log(`  - ${name}`));
    process.exit(1);
  }

  console.log(`Uploading ${filePath} to collection "${collection}"...`);

  const job = await uploadDocument(filePath, collection);
  console.log(`✓ Upload job created: ${job.jobId}`);
  console.log(`  Status: ${job.status}`);
  console.log(`  Stage: ${job.stage}`);

  // Poll for completion
  let status = job;
  while (status.status === 'queued' || status.status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 500));
    status = await checkJobStatus(job.jobId);
    console.log(`  ${status.stage}: ${status.progress}%`);
  }

  if (status.status === 'complete') {
    console.log(`✓ Upload complete! Added ${status.vectorsAdded} vectors.`);
  } else {
    console.error(`✗ Upload failed: ${status.error}`);
    process.exit(1);
  }
}

main().catch(console.error);
```

Save as `upload.js` and use:

```bash
node upload.js document.md my-collection
```

## Best Practices

1. **Check existing collections first** - Use `/collections/names` to see what collections exist
2. **Use descriptive collection names** - `research-papers`, `meeting-notes`, `customer-feedback`
3. **Monitor upload jobs** - Poll status endpoint for large files
4. **Handle errors gracefully** - Check response status and error codes
5. **Batch related documents** - Upload similar documents to the same collection for better semantic search

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/collections` | GET | List all collections with full details |
| `/collections/names` | GET | List collection names only (lightweight) |
| `/collections` | POST | Create a new collection |
| `/documents/upload` | POST | Upload a document (requires `file` and `collection`) |
| `/documents/upload/:jobId/status` | GET | Check upload job status |
| `/documents/jobs` | GET | List all upload jobs |

## Support

For issues or questions about the upload API, please refer to the main Ranger documentation or open an issue on GitHub.
