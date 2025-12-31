#!/usr/bin/env node
/**
 * Document Upload Example Script
 *
 * Demonstrates how to upload documents to the Ranger API with collection selection.
 *
 * Usage:
 *   node upload-document.js <file-path> [collection-name]
 *
 * If no collection is specified, lists available collections.
 */

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.RANGER_API_URL || 'http://localhost:3000/api';

/**
 * Get list of available collection names
 */
async function getCollections() {
  const response = await fetch(`${API_BASE}/collections/names`);

  if (!response.ok) {
    throw new Error(`Failed to fetch collections: ${response.statusText}`);
  }

  const data = await response.json();
  return data.names || [];
}

/**
 * Upload a document to specified collection
 */
async function uploadDocument(filePath, collectionName) {
  // Verify file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('collection', collectionName);

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Upload failed: ${error.error || response.statusText}`);
  }

  return await response.json();
}

/**
 * Check upload job status
 */
async function checkJobStatus(jobId) {
  const response = await fetch(`${API_BASE}/documents/upload/${jobId}/status`);

  if (!response.ok) {
    throw new Error(`Failed to check job status: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Poll job status until completion
 */
async function waitForCompletion(jobId, onProgress) {
  let status = await checkJobStatus(jobId);

  while (status.status === 'queued' || status.status === 'processing') {
    if (onProgress) {
      onProgress(status);
    }

    // Wait 500ms before next poll
    await new Promise(resolve => setTimeout(resolve, 500));
    status = await checkJobStatus(jobId);
  }

  return status;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const collectionName = args[1];

  console.log('🔍 Ranger Document Upload Tool\n');

  // Show usage if no file provided
  if (!filePath) {
    console.log('Usage: node upload-document.js <file-path> [collection-name]\n');
    console.log('Examples:');
    console.log('  node upload-document.js document.md research-papers');
    console.log('  node upload-document.js notes.txt my-notes');
    console.log('  node upload-document.js data.json datasets\n');

    try {
      const collections = await getCollections();
      if (collections.length > 0) {
        console.log('Available collections:');
        collections.forEach(name => console.log(`  • ${name}`));
      } else {
        console.log('No collections exist yet. Specify a name to create one.');
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err.message);
      console.error('Is the Ranger API running?');
    }

    process.exit(1);
  }

  // Show available collections if none specified
  if (!collectionName) {
    console.log(`File: ${filePath}\n`);
    console.log('No collection specified. Available collections:');

    try {
      const collections = await getCollections();
      if (collections.length > 0) {
        collections.forEach(name => console.log(`  • ${name}`));
        console.log('\nUsage: node upload-document.js <file-path> <collection-name>');
      } else {
        console.log('  No collections exist yet.');
        console.log('\nSpecify a collection name to create one automatically:');
        console.log(`  node upload-document.js ${filePath} my-collection`);
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err.message);
    }

    process.exit(1);
  }

  try {
    // Upload the document
    const fileName = path.basename(filePath);
    console.log(`📤 Uploading: ${fileName}`);
    console.log(`📁 Collection: ${collectionName}\n`);

    const job = await uploadDocument(filePath, collectionName);
    console.log(`✓ Upload job created: ${job.jobId}`);
    console.log(`  Initial status: ${job.status}`);
    console.log(`  Stage: ${job.stage}\n`);

    // Wait for completion with progress updates
    console.log('⏳ Processing...');
    const finalStatus = await waitForCompletion(job.jobId, (status) => {
      const progressBar = '█'.repeat(Math.floor(status.progress / 5)) + '░'.repeat(20 - Math.floor(status.progress / 5));
      process.stdout.write(`\r  [${progressBar}] ${status.progress}% - ${status.stage}`);
    });

    process.stdout.write('\n\n');

    // Show final result
    if (finalStatus.status === 'complete') {
      console.log('✅ Upload complete!');
      console.log(`  Vectors added: ${finalStatus.vectorsAdded}`);
      console.log(`  Duration: ${new Date(finalStatus.completedAt).getTime() - new Date(finalStatus.createdAt).getTime()}ms`);
      console.log('\n🔍 Your document is now searchable in the collection.');
    } else if (finalStatus.status === 'error') {
      console.error('❌ Upload failed!');
      console.error(`  Error: ${finalStatus.error}`);
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);

    if (err.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Make sure the Ranger API server is running on', API_BASE);
    } else if (err.message.includes('Available collections')) {
      console.error('\n💡 Use one of the available collections or create a new one');
    }

    process.exit(1);
  }
}

// Run main function
main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
