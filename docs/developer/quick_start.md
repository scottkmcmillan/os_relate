# Quick Start

To start Ranger Backend

  # Build the project
  npm run build --verbose

  # In a new terminal, start the API server
  # Use development mode with hot reload
  npm run api:dev

  # In a new terminal, add your token (one-time)
  ngrok config add-authtoken 37H6qfnvEKaGFR2LYCLGuN35dFB_3U2Ln7sZEQonr17Z6C1Rt

  # Start the tunnel
  ngrok http --url=albertina-inspiratory-pausingly.ngrok-free.dev 3000

  # Verify it's running
  curl http://localhost:3000/api/health


   | Command         | Purpose                                         |
  |-----------------|-------------------------------------------------|
  | npm run build   | Compile TS to dist/ (required before running)   |
  | npm test        | Run Vitest tests                                |
  | npm run verify  | Build + full system verification                |
  | npm run api:dev | Run API in dev mode (uses tsx, no build needed) |

  # List all collections
  curl http://localhost:3000/api/collections

  # Get just collection names (for dropdowns)
  curl http://localhost:3000/api/collections/names

  # Upload a document to a collection
  curl -X POST http://localhost:3000/api/documents/upload \
    -F "file=@document.md" \
    -F "collection=my-collection"