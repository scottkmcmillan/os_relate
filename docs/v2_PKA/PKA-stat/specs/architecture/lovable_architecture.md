# PKA-STRAT Lovable Frontend Architecture

**Version:** 1.0.0
**Date:** 2025-12-29
**Status:** Architecture Design
**Author:** System Architecture Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [System Diagram](#system-diagram)
4. [Frontend Layer (Lovable)](#frontend-layer-lovable)
5. [Backend Layer (FastAPI + PostgreSQL)](#backend-layer-fastapi--postgresql)
6. [Data Flow Architecture](#data-flow-architecture)
7. [Supabase Integration](#supabase-integration)
8. [API Gateway Patterns](#api-gateway-patterns)
9. [Authentication & Authorization](#authentication--authorization)
10. [Real-time Communication](#real-time-communication)
11. [File Upload & Processing](#file-upload--processing)
12. [Deployment Architecture](#deployment-architecture)
13. [Security Considerations](#security-considerations)
14. [Performance Optimization](#performance-optimization)
15. [Development Workflow](#development-workflow)
16. [Migration Path](#migration-path)

---

## Executive Summary

PKA-STRAT is pivoting from a Next.js full-stack approach to a **hybrid architecture** that leverages:

- **Lovable** for rapid frontend development (Vite + React + TypeScript + Shadcn UI)
- **Supabase** as Backend-as-a-Service for authentication, user management, and some data
- **Custom FastAPI backend** for document processing, alignment scoring, and strategic intelligence
- **PostgreSQL + RuVector Extension** for strategic data, vector embeddings, and hypergraph
- **Hybrid data strategy**: Supabase for user/auth data, backend API for business logic

This architecture provides:
- ✅ Rapid UI development with Lovable's AI-powered code generation
- ✅ Robust authentication and user management via Supabase
- ✅ Specialized backend for complex strategic analysis
- ✅ Flexibility to scale components independently
- ✅ Cost-effective development and hosting

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                                   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │          LOVABLE-GENERATED FRONTEND                             │    │
│  │          (Vite + React + TypeScript + Shadcn UI)               │    │
│  │                                                                 │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │    │
│  │  │  Dashboard   │  │  Documents   │  │  Alignment   │        │    │
│  │  │  Components  │  │  Manager     │  │  Visualizer  │        │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │    │
│  │                                                                 │    │
│  │  ┌──────────────────────────────────────────────────────┐     │    │
│  │  │  State Management (Zustand/React Query)              │     │    │
│  │  └──────────────────────────────────────────────────────┘     │    │
│  │                                                                 │    │
│  │  ┌──────────────┐            ┌──────────────┐                │    │
│  │  │  Supabase    │            │  API Client  │                │    │
│  │  │  Client      │            │  (Axios)     │                │    │
│  │  └──────┬───────┘            └──────┬───────┘                │    │
│  └─────────┼───────────────────────────┼────────────────────────┘    │
└────────────┼───────────────────────────┼─────────────────────────────┘
             │                           │
             │ Auth, Users               │ Strategic Data
             │ Real-time Updates         │ Document Processing
             │                           │
┌────────────▼──────────┐    ┌──────────▼──────────────────────────────┐
│  SUPABASE (BaaS)      │    │  PKA-STRAT BACKEND API                  │
│                       │    │  (FastAPI + Python)                     │
│  ┌─────────────────┐ │    │                                          │
│  │ Supabase Auth   │ │    │  ┌────────────────────────────────┐    │
│  │ - JWT Tokens    │ │    │  │  API Routes                     │    │
│  │ - OAuth/SSO     │ │    │  │  - /documents                   │    │
│  │ - Magic Links   │ │    │  │  - /pyramid                     │    │
│  └─────────────────┘ │    │  │  - /alignment                   │    │
│                       │    │  │  - /market-intelligence        │    │
│  ┌─────────────────┐ │    │  └────────────────────────────────┘    │
│  │ Supabase DB     │ │    │                                          │
│  │ (PostgreSQL)    │ │    │  ┌────────────────────────────────┐    │
│  │ - users         │ │    │  │  Business Logic                 │    │
│  │ - profiles      │ │    │  │  - Document Processing          │    │
│  │ - sessions      │ │    │  │  - Embedding Generation         │    │
│  └─────────────────┘ │    │  │  - Alignment Scoring Engine     │    │
│                       │    │  │  - Strategic Resonance Engine   │    │
│  ┌─────────────────┐ │    │  └────────────────────────────────┘    │
│  │ Supabase        │ │    │                                          │
│  │ Realtime        │◄─┼────┼──  WebSocket for live updates          │
│  └─────────────────┘ │    │                                          │
│                       │    │  ┌────────────────────────────────┐    │
│  ┌─────────────────┐ │    │  │  JWT Validation Middleware      │    │
│  │ Supabase        │ │    │  │  - Verify Supabase JWT          │    │
│  │ Storage         │ │    │  │  - Extract user context         │    │
│  │ - Temp uploads  │ │    │  └────────────────────────────────┘    │
│  └─────────────────┘ │    │                                          │
└───────────────────────┘    └──────────────┬───────────────────────────┘
                                            │
                                            │
                             ┌──────────────▼──────────────────────────┐
                             │  PKA-STRAT DATABASE                     │
                             │  (PostgreSQL + RuVector)                │
                             │                                          │
                             │  ┌────────────────────────────────┐    │
                             │  │  Strategic Data                 │    │
                             │  │  - pyramid_entities             │    │
                             │  │  - documents                    │    │
                             │  │  - alignment_scores             │    │
                             │  │  - hypergraph structures        │    │
                             │  └────────────────────────────────┘    │
                             │                                          │
                             │  ┌────────────────────────────────┐    │
                             │  │  Vector Storage (RuVector)      │    │
                             │  │  - document_embeddings          │    │
                             │  │  - semantic search indexes      │    │
                             │  └────────────────────────────────┘    │
                             │                                          │
                             └──────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Lovable for Frontend** | Rapid UI development with AI assistance; modern React + TypeScript stack |
| **Supabase for Auth/Users** | Proven auth infrastructure; JWT tokens; OAuth providers; user management |
| **FastAPI for Business Logic** | Python ecosystem for AI/ML; async performance; OpenAPI auto-docs |
| **Hybrid Data Strategy** | Supabase for user data; backend DB for strategic/vector data |
| **PostgreSQL + RuVector** | Relational + vector + hypergraph in single database; SIMD-accelerated |
| **JWT-based Auth** | Stateless authentication; Supabase generates, backend validates |

---

## System Diagram

### Component Interaction Flow

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │
       │ 1. User visits app
       ▼
┌────────────────────────────────┐
│  Lovable Frontend (SPA)        │
│  - React Components            │
│  - Supabase Client initialized │
└────────┬───────────────────────┘
         │
         │ 2. User logs in
         ▼
┌────────────────────────────────┐
│  Supabase Auth                 │
│  - Email/password              │
│  - OAuth (Google, GitHub)      │
│  - Returns JWT token           │
└────────┬───────────────────────┘
         │
         │ 3. Token stored in browser
         │    (localStorage/sessionStorage)
         │
         │ 4. User uploads document
         ▼
┌────────────────────────────────┐
│  Frontend API Client           │
│  - Includes JWT in headers     │
│  - POST /api/v1/documents      │
└────────┬───────────────────────┘
         │
         │ 5. Request with JWT
         ▼
┌────────────────────────────────┐
│  Backend API Gateway           │
│  - Validate JWT with Supabase  │
│  - Extract user_id, org_id     │
│  - Check permissions           │
└────────┬───────────────────────┘
         │
         │ 6. Authorized request
         ▼
┌────────────────────────────────┐
│  Document Processing Service   │
│  - Store file                  │
│  - Extract text                │
│  - Generate embeddings         │
│  - Calculate alignment         │
└────────┬───────────────────────┘
         │
         │ 7. Write to database
         ▼
┌────────────────────────────────┐
│  PostgreSQL Database           │
│  - documents table             │
│  - document_chunks             │
│  - document_embeddings         │
│  - alignment_scores            │
└────────┬───────────────────────┘
         │
         │ 8. Real-time update
         ▼
┌────────────────────────────────┐
│  WebSocket / Supabase Realtime │
│  - Notify frontend             │
│  - "Document ready"            │
└────────┬───────────────────────┘
         │
         │ 9. UI updates automatically
         ▼
┌────────────────────────────────┐
│  Frontend Dashboard            │
│  - Shows processed document    │
│  - Displays alignment score    │
└────────────────────────────────┘
```

---

## Frontend Layer (Lovable)

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Build Tool** | Vite | Ultra-fast HMR, optimized builds |
| **Framework** | React 18+ | Component-based UI, hooks, concurrent features |
| **Language** | TypeScript | Type safety, better DX |
| **UI Components** | Shadcn UI | Beautiful, accessible components |
| **Styling** | Tailwind CSS | Utility-first styling, design system |
| **State Management** | Zustand + React Query | Client state + server state caching |
| **Routing** | React Router v6 | Client-side routing |
| **Forms** | React Hook Form + Zod | Type-safe form validation |
| **Auth Client** | Supabase JS Client | Authentication, real-time |
| **HTTP Client** | Axios | API requests to backend |
| **Charts/Viz** | Recharts / D3.js | Alignment visualization |

### Project Structure

```
lovable-frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── dashboard/       # Dashboard-specific components
│   │   │   ├── LeaderDashboard.tsx
│   │   │   ├── ManagerDashboard.tsx
│   │   │   └── MemberDashboard.tsx
│   │   ├── documents/       # Document management
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── DocumentList.tsx
│   │   │   └── DocumentViewer.tsx
│   │   ├── pyramid/         # Pyramid of Clarity
│   │   │   ├── PyramidHierarchy.tsx
│   │   │   ├── EntityCard.tsx
│   │   │   └── EntityEditor.tsx
│   │   ├── alignment/       # Alignment visualization
│   │   │   ├── AlignmentHeatmap.tsx
│   │   │   ├── DriftAlerts.tsx
│   │   │   └── ProvenanceView.tsx
│   │   └── layout/          # Layout components
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Layout.tsx
│   ├── pages/               # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── Documents.tsx
│   │   ├── Pyramid.tsx
│   │   ├── Alignment.tsx
│   │   ├── MarketIntelligence.tsx
│   │   └── Settings.tsx
│   ├── lib/                 # Utilities
│   │   ├── supabase.ts      # Supabase client
│   │   ├── api-client.ts    # Backend API client
│   │   ├── auth.ts          # Auth helpers
│   │   └── utils.ts         # General utilities
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useDocuments.ts
│   │   ├── usePyramid.ts
│   │   └── useRealtime.ts
│   ├── stores/              # Zustand stores
│   │   ├── authStore.ts
│   │   ├── pyramidStore.ts
│   │   └── uiStore.ts
│   ├── types/               # TypeScript types
│   │   ├── api.ts           # API types from OpenAPI
│   │   ├── supabase.ts      # Supabase types
│   │   └── models.ts        # Domain models
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   └── router.tsx           # Route configuration
├── public/
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### Key Frontend Components

#### 1. Supabase Client Initialization

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### 2. Backend API Client

```typescript
// lib/api-client.ts
import axios from 'axios'
import { supabase } from './supabase'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor to add JWT token from Supabase
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }

  return config
})

// Interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, refresh or redirect to login
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

#### 3. Auth Hook

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    session,
    loading,
    signIn: (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    signUp: (email: string, password: string) =>
      supabase.auth.signUp({ email, password }),
  }
}
```

#### 4. Document Upload Component

```typescript
// components/documents/DocumentUpload.tsx
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import apiClient from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export function DocumentUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'strategic')
    formData.append('name', file.name)

    try {
      const response = await apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          )
          setProgress(percentCompleted)
        },
      })

      console.log('Document uploaded:', response.data)
      // Refresh document list
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div>
          <p className="mb-2">Uploading...</p>
          <Progress value={progress} className="w-full" />
        </div>
      ) : (
        <div>
          <p className="text-lg font-semibold mb-2">
            {isDragActive ? 'Drop the file here' : 'Drag & drop a document'}
          </p>
          <p className="text-sm text-gray-500">
            or click to select (PDF, DOCX, TXT, MD)
          </p>
        </div>
      )}
    </div>
  )
}
```

---

## Backend Layer (FastAPI + PostgreSQL)

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | FastAPI | Modern Python API framework, async, auto-docs |
| **Language** | Python 3.11+ | AI/ML ecosystem, type hints |
| **Database** | PostgreSQL 15+ | Relational database |
| **Vector Extension** | RuVector | Vector similarity search + hypergraph (SIMD-accelerated) |
| **ORM** | SQLAlchemy 2.0 | Database abstraction, migrations |
| **Migrations** | Alembic | Database version control |
| **Auth** | Supabase JWT validation | Verify tokens from Supabase |
| **Background Tasks** | Celery + Redis | Async document processing |
| **Embeddings** | OpenAI API | Text embeddings for vector search |
| **PDF Processing** | PyMuPDF / PyPDF2 | Extract text from PDFs |
| **HTTP Server** | Uvicorn | ASGI server |

### Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # Auth middleware
│   │   │   ├── documents.py      # Document endpoints
│   │   │   ├── pyramid.py        # Pyramid endpoints
│   │   │   ├── alignment.py      # Alignment endpoints
│   │   │   ├── dashboards.py     # Dashboard data
│   │   │   ├── market.py         # Market intelligence
│   │   │   └── websocket.py      # WebSocket endpoints
│   │   └── deps.py               # Dependency injection
│   ├── core/
│   │   ├── config.py             # Settings (env vars)
│   │   ├── security.py           # JWT validation
│   │   ├── database.py           # DB connection
│   │   └── logging.py            # Logging config
│   ├── models/
│   │   ├── __init__.py
│   │   ├── pyramid.py            # SQLAlchemy models
│   │   ├── document.py
│   │   ├── alignment.py
│   │   └── market.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── document.py           # Pydantic schemas (API)
│   │   ├── pyramid.py
│   │   ├── alignment.py
│   │   └── user.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── document_processor.py  # Document chunking
│   │   ├── embedding_service.py   # Generate embeddings
│   │   ├── alignment_engine.py    # Calculate alignment
│   │   ├── resonance_engine.py    # Strategic resonance
│   │   └── market_analyzer.py     # Market intelligence
│   ├── tasks/
│   │   ├── __init__.py
│   │   ├── celery_app.py          # Celery config
│   │   └── document_tasks.py      # Async processing tasks
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── vector.py              # Vector utilities
│   │   ├── pdf_extractor.py       # PDF text extraction
│   │   └── validators.py          # Custom validators
│   ├── main.py                    # FastAPI app entry
│   └── __init__.py
├── alembic/
│   ├── versions/
│   └── env.py
├── tests/
│   ├── api/
│   ├── services/
│   └── conftest.py
├── .env.example
├── requirements.txt
├── pyproject.toml
└── README.md
```

### Key Backend Components

#### 1. FastAPI App Setup

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import documents, pyramid, alignment, dashboards, market
from app.core.config import settings

app = FastAPI(
    title="PKA-STRAT Backend API",
    version="1.0.0",
    description="Strategic Alignment Intelligence Platform API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(pyramid.router, prefix="/api/v1/pyramid", tags=["Pyramid"])
app.include_router(alignment.router, prefix="/api/v1/alignment", tags=["Alignment"])
app.include_router(dashboards.router, prefix="/api/v1/dashboards", tags=["Dashboards"])
app.include_router(market.router, prefix="/api/v1/market", tags=["Market"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

#### 2. Supabase JWT Validation

```python
# app/core/security.py
from jose import jwt, JWTError
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
import httpx

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Validate Supabase JWT token and extract user info.
    """
    token = credentials.credentials

    try:
        # Decode and verify JWT using Supabase public key
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )

        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        role: str = payload.get("role")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Optionally verify with Supabase API
        # This ensures token hasn't been revoked
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Token verification failed")

        return {
            "user_id": user_id,
            "email": email,
            "role": role,
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

#### 3. Document Upload Endpoint

```python
# app/api/v1/documents.py
from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core.security import get_current_user
from app.services.document_processor import process_document
from app.schemas.document import DocumentCreate, DocumentResponse
import uuid

router = APIRouter()

@router.post("/", response_model=DocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str = "strategic",
    name: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a document for processing.

    - **file**: Document file (PDF, DOCX, TXT, MD)
    - **doc_type**: strategic | operational | market | reference
    - **name**: Optional custom name (defaults to filename)
    """

    # Validate file type
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    # Validate file size (50MB max)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    # Generate file path
    file_id = str(uuid.uuid4())
    file_path = f"uploads/{current_user['user_id']}/{file_id}/{file.filename}"

    # Save file to local storage
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Create document record
    document = Document(
        id=file_id,
        organization_id=current_user.get("organization_id"),
        title=name or file.filename,
        file_name=file.filename,
        file_type=file.content_type,
        file_size_bytes=file_size,
        file_path=file_path,
        doc_type=doc_type,
        author_id=current_user["user_id"],
        processing_status="pending",
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    # Enqueue background processing
    background_tasks.add_task(process_document, file_id, file_path)

    return document
```

#### 4. Document Processing Service

```python
# app/services/document_processor.py
from app.models.document import Document, DocumentChunk
from app.services.embedding_service import generate_embedding
from app.utils.pdf_extractor import extract_text_from_pdf
from sqlalchemy.orm import Session
import re

def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    """
    Chunk text into semantic paragraphs.
    """
    paragraphs = re.split(r'\n\s*\n', text)
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) > chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            current_chunk += "\n\n" + para

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

async def process_document(document_id: str, file_path: str):
    """
    Background task to process uploaded document.

    1. Extract text
    2. Chunk into semantic segments
    3. Generate embeddings
    4. Store in database
    5. Calculate initial alignment
    """
    from app.core.database import SessionLocal

    db = SessionLocal()

    try:
        # Update status
        document = db.query(Document).filter(Document.id == document_id).first()
        document.processing_status = "processing"
        db.commit()

        # Extract text
        if document.file_type == "application/pdf":
            text = extract_text_from_pdf(file_path)
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()

        document.content_text = text

        # Chunk text
        chunks = chunk_text(text)

        # Generate embeddings and store chunks
        for idx, chunk_text in enumerate(chunks):
            embedding_vector = await generate_embedding(chunk_text)

            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=idx,
                content=chunk_text,
                content_length=len(chunk_text),
                embedding=embedding_vector,
            )
            db.add(chunk)

        # Generate document-level embedding (average of chunk embeddings)
        doc_embedding = await generate_embedding(text[:8000])  # Truncate for API limit
        document.embedding = doc_embedding

        # Update status
        document.processing_status = "indexed"
        document.indexed_at = datetime.utcnow()

        db.commit()

        # TODO: Trigger alignment calculation

    except Exception as e:
        document.processing_status = "failed"
        document.processing_error = str(e)
        db.commit()

    finally:
        db.close()
```

---

## Data Flow Architecture

### Request-Response Flow

```
┌──────────────┐
│   Frontend   │
│   (Lovable)  │
└──────┬───────┘
       │
       │ 1. User action (e.g., upload document)
       │    GET/POST/PUT/DELETE request
       │    Authorization: Bearer <supabase_jwt>
       │
       ▼
┌────────────────────────────────────────┐
│  Backend API Gateway (FastAPI)         │
│  ┌──────────────────────────────────┐ │
│  │  Middleware: CORS                │ │
│  │  Middleware: Request Logging     │ │
│  │  Middleware: Error Handling      │ │
│  └──────────────────────────────────┘ │
└────────┬───────────────────────────────┘
         │
         │ 2. JWT Validation
         ▼
┌────────────────────────────────────────┐
│  Security Layer                        │
│  ┌──────────────────────────────────┐ │
│  │  Extract JWT from headers        │ │
│  │  Decode with Supabase secret     │ │
│  │  Verify signature & expiry       │ │
│  │  Extract user_id, email, role    │ │
│  └──────────────────────────────────┘ │
└────────┬───────────────────────────────┘
         │
         │ 3. Authorized user context
         ▼
┌────────────────────────────────────────┐
│  API Route Handler                     │
│  ┌──────────────────────────────────┐ │
│  │  Validate request schema         │ │
│  │  Check user permissions          │ │
│  │  Apply business logic            │ │
│  └──────────────────────────────────┘ │
└────────┬───────────────────────────────┘
         │
         │ 4. Service layer
         ▼
┌────────────────────────────────────────┐
│  Business Logic Services               │
│  ┌──────────────────────────────────┐ │
│  │  DocumentService                 │ │
│  │  PyramidService                  │ │
│  │  AlignmentService                │ │
│  │  EmbeddingService                │ │
│  └──────────────────────────────────┘ │
└────────┬───────────────────────────────┘
         │
         │ 5. Database operations
         ▼
┌────────────────────────────────────────┐
│  Data Layer (SQLAlchemy ORM)           │
│  ┌──────────────────────────────────┐ │
│  │  Query building                  │ │
│  │  Transaction management          │ │
│  │  Connection pooling              │ │
│  └──────────────────────────────────┘ │
└────────┬───────────────────────────────┘
         │
         │ 6. SQL queries
         ▼
┌────────────────────────────────────────┐
│  PostgreSQL Database                   │
│  ┌──────────────────────────────────┐ │
│  │  Execute queries                 │ │
│  │  Vector similarity search        │ │
│  │  Return results                  │ │
│  └──────────────────────────────────┘ │
└────────┬───────────────────────────────┘
         │
         │ 7. Data returned
         ▼
┌────────────────────────────────────────┐
│  Response Serialization                │
│  ┌──────────────────────────────────┐ │
│  │  Convert ORM models to Pydantic  │ │
│  │  Serialize to JSON               │ │
│  │  Add metadata (pagination, etc)  │ │
│  └──────────────────────────────────┘ │
└────────┬───────────────────────────────┘
         │
         │ 8. HTTP Response
         │    Status: 200 OK
         │    Content-Type: application/json
         │
         ▼
┌──────────────┐
│   Frontend   │
│   Receives   │
│   Response   │
└──────────────┘
```

### Data Storage Strategy

| Data Type | Storage Location | Rationale |
|-----------|-----------------|-----------|
| **User accounts** | Supabase PostgreSQL | Auth infrastructure, managed service |
| **User profiles** | Supabase PostgreSQL | Extends auth users, real-time sync |
| **Sessions/tokens** | Supabase (in-memory) | Managed by Supabase Auth |
| **Strategic entities** | Backend PostgreSQL | Complex business logic, vector search |
| **Documents** | Backend file system + DB | Binary files local, metadata in DB |
| **Document embeddings** | Backend PostgreSQL (RuVector) | Semantic search, alignment scoring, hypergraph |
| **Alignment scores** | Backend PostgreSQL | Time-series data, analytics |
| **Temporary file uploads** | Supabase Storage (optional) | Client-side direct upload before backend processing |

---

## Supabase Integration

### Supabase Setup

#### 1. Database Schema (Supabase PostgreSQL)

```sql
-- Users table (managed by Supabase Auth)
-- auth.users is automatically created

-- User profiles (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('leader', 'manager', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations (minimal, detailed data in backend)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row-level security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);
```

#### 2. Supabase Auth Configuration

Enable auth providers in Supabase Dashboard:
- Email/Password (default)
- Google OAuth
- GitHub OAuth
- Magic Links

Email templates for:
- Confirmation
- Password reset
- Invite user

#### 3. Supabase Storage (Optional for Temp Uploads)

```typescript
// Frontend: Upload to Supabase Storage, then process via backend
import { supabase } from '@/lib/supabase'

async function uploadToSupabase(file: File) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `uploads/${fileName}`

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, file)

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath)

  // Send public URL to backend for processing
  await apiClient.post('/documents/process', { url: publicUrl })
}
```

### Supabase Realtime

#### 1. Subscribe to Database Changes

```typescript
// Frontend: Listen for document processing updates
import { supabase } from '@/lib/supabase'

export function useDocumentUpdates() {
  useEffect(() => {
    // This requires enabling Realtime on backend tables
    // Alternatively, use WebSocket from backend

    const channel = supabase
      .channel('document-updates')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `author_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Document updated:', payload.new)
          // Update local state
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])
}
```

**Note**: For backend database changes, WebSocket from FastAPI is more appropriate (see Real-time Communication section).

---

## API Gateway Patterns

### API Endpoint Organization

```
/api/v1/
├── /auth/                    # Handled by Supabase (frontend direct)
│   ├── /login                # Supabase Auth
│   ├── /logout
│   ├── /register
│   └── /refresh-token
│
├── /documents/               # Backend API
│   ├── GET /                 # List documents
│   ├── POST /                # Upload document
│   ├── GET /{id}             # Get document details
│   ├── DELETE /{id}          # Delete document
│   ├── GET /{id}/chunks      # Get document chunks
│   └── POST /{id}/reprocess  # Trigger reprocessing
│
├── /pyramid/                 # Backend API
│   ├── GET /                 # Get full hierarchy
│   ├── GET /{level}          # Get items at level
│   ├── POST /{level}         # Create item at level
│   ├── GET /{level}/{id}     # Get specific item
│   ├── PUT /{level}/{id}     # Update item
│   ├── DELETE /{level}/{id}  # Delete item
│   └── POST /link            # Link items
│
├── /alignment/               # Backend API
│   ├── GET /scores           # Get alignment scores
│   ├── GET /drift            # Get drift alerts
│   ├── GET /provenance/{id}  # Get L-Score provenance
│   ├── POST /analyze         # Trigger alignment analysis
│   └── GET /heatmap          # Get heatmap data
│
├── /dashboards/              # Backend API
│   ├── GET /leader           # Leader dashboard data
│   ├── GET /manager          # Manager dashboard data
│   └── GET /member           # Member dashboard data
│
└── /market/                  # Backend API
    ├── POST /analyze         # Analyze market document
    ├── GET /signals          # Get market signals
    └── POST /simulate        # Run scenario simulation
```

### Request/Response Patterns

#### 1. Standard Response Format

```json
{
  "data": { ... },           // Single resource
  "data": [ ... ],           // Multiple resources
  "pagination": {            // For list endpoints
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "metadata": {              // Optional
    "timestamp": "2025-12-29T10:30:00Z",
    "version": "1.0.0"
  }
}
```

#### 2. Error Response Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid document type",
    "details": {
      "field": "doc_type",
      "allowed_values": ["strategic", "operational", "market", "reference"]
    },
    "timestamp": "2025-12-29T10:30:00Z"
  }
}
```

### API Versioning

- **URL versioning**: `/api/v1/`, `/api/v2/`
- **Deprecation headers**:
  ```
  Deprecation: true
  Sunset: Sat, 31 Dec 2025 23:59:59 GMT
  Link: </api/v2/documents>; rel="successor-version"
  ```

---

## Authentication & Authorization

### Authentication Flow

```
┌──────────────┐
│   User       │
└──────┬───────┘
       │
       │ 1. Navigate to app
       ▼
┌────────────────────────────────┐
│  Frontend checks auth state    │
│  (Supabase client)             │
└────────┬───────────────────────┘
         │
         │ 2. No session → Redirect to login
         ▼
┌────────────────────────────────┐
│  Login Page                    │
│  - Email/Password form         │
│  - OAuth buttons (Google, etc) │
└────────┬───────────────────────┘
         │
         │ 3. User submits credentials
         ▼
┌────────────────────────────────┐
│  Supabase Auth API             │
│  - Validate credentials        │
│  - Generate JWT access token   │
│  - Generate refresh token      │
└────────┬───────────────────────┘
         │
         │ 4. Return tokens
         ▼
┌────────────────────────────────┐
│  Frontend receives tokens      │
│  - Store in localStorage       │
│  - Set in Supabase client      │
│  - Redirect to dashboard       │
└────────┬───────────────────────┘
         │
         │ 5. User makes API request
         ▼
┌────────────────────────────────┐
│  API Client (Axios)            │
│  - Get token from Supabase     │
│  - Add to Authorization header │
│  - Send request to backend     │
└────────┬───────────────────────┘
         │
         │ 6. Request with JWT
         ▼
┌────────────────────────────────┐
│  Backend API                   │
│  - Extract JWT from header     │
│  - Verify signature            │
│  - Extract user claims         │
│  - Check permissions           │
└────────┬───────────────────────┘
         │
         │ 7. Authorized → Process request
         │    Unauthorized → 401 error
         ▼
┌────────────────────────────────┐
│  Response to frontend          │
└────────────────────────────────┘
```

### JWT Token Structure

```json
{
  "sub": "user-uuid",              // User ID
  "email": "user@example.com",     // Email
  "role": "authenticated",         // Supabase role
  "aud": "authenticated",          // Audience
  "exp": 1735478400,               // Expiration timestamp
  "iat": 1735474800,               // Issued at
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "organization_id": "org-uuid",
    "role": "leader"               // Application role
  }
}
```

### Authorization Levels

| Role | Permissions |
|------|------------|
| **Leader** | - Full access to all organization data<br>- Create/edit mission, vision, objectives<br>- Manage users and teams<br>- View all dashboards<br>- Export reports |
| **Manager** | - View organization data<br>- Create/edit goals, portfolios, programs, projects<br>- Manage team members<br>- View manager & member dashboards |
| **Member** | - View assigned projects and tasks<br>- Create/edit tasks<br>- Upload project documents<br>- View member dashboard |

### Backend Permission Check

```python
# app/api/deps.py
from fastapi import Depends, HTTPException
from app.core.security import get_current_user

def require_role(required_role: str):
    """
    Dependency to check if user has required role.
    """
    async def check_role(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("user_metadata", {}).get("role")

        role_hierarchy = {"member": 1, "manager": 2, "leader": 3}

        if role_hierarchy.get(user_role, 0) < role_hierarchy.get(required_role, 999):
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. {required_role} role required."
            )

        return current_user

    return check_role

# Usage in endpoints
@router.post("/pyramid/mission")
async def create_mission(
    current_user: dict = Depends(require_role("leader"))
):
    # Only leaders can create mission
    ...
```

---

## Real-time Communication

### WebSocket Architecture

```
┌──────────────┐
│   Frontend   │
└──────┬───────┘
       │
       │ 1. Establish WebSocket connection
       │    ws://backend/ws/alignment?token=<jwt>
       ▼
┌────────────────────────────────┐
│  Backend WebSocket Handler     │
│  (FastAPI WebSocket)           │
└────────┬───────────────────────┘
         │
         │ 2. Validate JWT token
         ▼
┌────────────────────────────────┐
│  WebSocket Authentication      │
│  - Extract token from query    │
│  - Verify JWT                  │
│  - Store connection context    │
└────────┬───────────────────────┘
         │
         │ 3. Connection established
         │    Send heartbeat (ping/pong)
         ▼
┌────────────────────────────────┐
│  Active WebSocket Connection   │
│  - Frontend listens for events │
│  - Backend publishes updates   │
└────────┬───────────────────────┘
         │
         │ 4. Backend event occurs
         │    (e.g., document processed, alignment updated)
         ▼
┌────────────────────────────────┐
│  Event Publisher               │
│  - Detect state change         │
│  - Serialize event data        │
│  - Publish to connected clients│
└────────┬───────────────────────┘
         │
         │ 5. WebSocket message sent
         ▼
┌────────────────────────────────┐
│  Frontend Event Handler        │
│  - Receive WebSocket message   │
│  - Parse event data            │
│  - Update UI state             │
└────────────────────────────────┘
```

### Backend WebSocket Implementation

```python
# app/api/v1/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.security import verify_jwt_token

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/alignment")
async def websocket_alignment(websocket: WebSocket, token: str):
    # Verify JWT from query parameter
    try:
        user_data = verify_jwt_token(token)
        user_id = user_data["user_id"]
    except:
        await websocket.close(code=1008)  # Policy violation
        return

    await manager.connect(websocket, user_id)

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "timestamp": datetime.utcnow().isoformat(),
            "message": "WebSocket connection established"
        })

        # Keep connection alive with heartbeat
        while True:
            # Receive messages from client (if any)
            data = await websocket.receive_text()

            # Echo heartbeat
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

# Publish alignment update (called from background tasks)
async def publish_alignment_update(user_id: str, data: dict):
    await manager.send_to_user(user_id, {
        "type": "alignment_update",
        "timestamp": datetime.utcnow().isoformat(),
        "data": data
    })
```

### Frontend WebSocket Client

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAlignmentWebSocket() {
  const ws = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)

  useEffect(() => {
    const connect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const token = session.access_token
      const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/alignment?token=${token}`

      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setConnected(true)

        // Start heartbeat
        const interval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send('ping')
          }
        }, 30000)

        ws.current.onclose = () => {
          clearInterval(interval)
        }
      }

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('WebSocket message:', data)
        setLastMessage(data)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.current.onclose = () => {
        console.log('WebSocket disconnected')
        setConnected(false)

        // Reconnect after 5 seconds
        setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      ws.current?.close()
    }
  }, [])

  return { connected, lastMessage }
}
```

---

## File Upload & Processing

### Upload Flow

```
┌──────────────┐
│   Frontend   │
│   (User)     │
└──────┬───────┘
       │
       │ 1. User selects file
       ▼
┌────────────────────────────────┐
│  File Validation (Frontend)    │
│  - Check file type             │
│  - Check file size (<50MB)     │
│  - Preview file metadata       │
└────────┬───────────────────────┘
         │
         │ 2. File validated
         ▼
┌────────────────────────────────┐
│  Upload to Backend             │
│  POST /api/v1/documents        │
│  multipart/form-data           │
│  Authorization: Bearer <token> │
└────────┬───────────────────────┘
         │
         │ 3. File received
         ▼
┌────────────────────────────────┐
│  Backend: Save File            │
│  - Store in local filesystem   │
│  - Generate unique file path   │
│  - Create document record      │
│  - Status: "pending"           │
└────────┬───────────────────────┘
         │
         │ 4. Return document ID immediately
         │    (202 Accepted)
         ▼
┌────────────────────────────────┐
│  Frontend: Show "Processing"   │
│  - Display progress spinner    │
│  - Subscribe to WebSocket      │
└────────┬───────────────────────┘
         │
         │ 5. Backend: Enqueue background task
         ▼
┌────────────────────────────────┐
│  Celery Task Queue             │
│  - Process document async      │
│  - Extract text                │
│  - Chunk content               │
│  - Generate embeddings         │
└────────┬───────────────────────┘
         │
         │ 6. Processing complete
         ▼
┌────────────────────────────────┐
│  Update Document Status        │
│  - Status: "indexed"           │
│  - indexed_at: timestamp       │
│  - chunk_count: 47             │
└────────┬───────────────────────┘
         │
         │ 7. Publish WebSocket event
         ▼
┌────────────────────────────────┐
│  WebSocket: Notify Frontend    │
│  {                             │
│    type: "document_ready",     │
│    data: { id, status, ... }   │
│  }                             │
└────────┬───────────────────────┘
         │
         │ 8. Frontend receives update
         ▼
┌────────────────────────────────┐
│  Update UI                     │
│  - Remove spinner              │
│  - Show "Processing Complete"  │
│  - Display document details    │
└────────────────────────────────┘
```

### File Storage Strategy

| Environment | Storage Location | Rationale |
|-------------|-----------------|-----------|
| **Development** | Local filesystem (`./uploads/`) | Simple, no external dependencies |
| **Staging/Production** | Local filesystem with volume mounts | Cost-effective, performant for small-medium scale |
| **Future: Scale** | Object storage (S3, MinIO) | Distributed, durable, scalable |

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # File storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_FILE_TYPES: list[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
    ]

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Deployment Architecture

### Production Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INTERNET                                       │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ HTTPS (443)
                                 ▼
                   ┌──────────────────────────┐
                   │   CDN / Load Balancer    │
                   │   (Cloudflare, Nginx)    │
                   └──────────┬───────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│  FRONTEND             │           │  BACKEND API          │
│  (Lovable + Vite)     │           │  (FastAPI + Uvicorn)  │
│                       │           │                       │
│  - Static files       │           │  - Python app         │
│  - Served by CDN/Nginx│           │  - Gunicorn workers   │
│  - lovable.app or     │           │  - Docker container   │
│    custom domain      │           │  - Auto-scaling       │
└───────────────────────┘           └──────────┬────────────┘
                                               │
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                         ▼                     ▼                     ▼
              ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
              │  SUPABASE        │  │  POSTGRESQL      │  │  REDIS           │
              │  (Managed BaaS)  │  │  (Primary DB)    │  │  (Cache/Queue)   │
              │                  │  │                  │  │                  │
              │  - Auth          │  │  - Strategic data│  │  - Celery tasks  │
              │  - User DB       │  │  - RuVector      │  │  - Session cache │
              │  - Real-time     │  │  - Indexes       │  │  - Rate limiting │
              │  - Storage       │  │                  │  │                  │
              └──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Hosting Recommendations

| Component | Recommended Platform | Alternative | Cost Estimate |
|-----------|---------------------|-------------|---------------|
| **Frontend** | Lovable hosting / Vercel | Netlify, Cloudflare Pages | $0-20/mo |
| **Backend API** | Railway / Render | Fly.io, AWS ECS | $20-100/mo |
| **PostgreSQL** | Railway / Supabase | Neon, AWS RDS | $25-100/mo |
| **Supabase** | Supabase Cloud | Self-hosted | $25-100/mo |
| **Redis** | Upstash / Redis Cloud | Railway addon | $10-50/mo |
| **Monitoring** | Sentry / LogRocket | Self-hosted Grafana | $0-50/mo |

**Total estimated cost**: $80-420/mo (depending on scale)

### Environment Variables

#### Frontend (.env)

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend API
VITE_BACKEND_API_URL=https://api.yourapp.com/api/v1
VITE_WS_URL=wss://api.yourapp.com

# Environment
VITE_ENV=production
```

#### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/pka_strat
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Supabase (for JWT validation)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-settings

# Redis
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...

# File storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE_MB=50

# CORS
FRONTEND_URL=https://yourapp.com
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com

# Security
SECRET_KEY=your-secret-key-for-signing
ENVIRONMENT=production

# Logging
LOG_LEVEL=INFO
SENTRY_DSN=https://...@sentry.io/...
```

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL with RuVector extension
  postgres:
    image: ruvector/postgres:latest
    environment:
      POSTGRES_DB: pka_strat
      POSTGRES_USER: pka_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis for caching and Celery
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Backend API
  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
      - ./uploads:/app/uploads
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://pka_user:dev_password@postgres:5432/pka_strat
      - REDIS_URL=redis://redis:6379/0
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis

  # Celery worker
  celery:
    build: ./backend
    command: celery -A app.tasks.celery_app worker --loglevel=info
    volumes:
      - ./backend:/app
      - ./uploads:/app/uploads
    environment:
      - DATABASE_URL=postgresql://pka_user:dev_password@postgres:5432/pka_strat
      - CELERY_BROKER_URL=redis://redis:6379/1
      - CELERY_RESULT_BACKEND=redis://redis:6379/2
    depends_on:
      - postgres
      - redis

  # Frontend (optional, usually run via Vite dev server)
  frontend:
    build: ./frontend
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
      - VITE_BACKEND_API_URL=http://localhost:8000/api/v1

volumes:
  postgres_data:
```

---

## Security Considerations

### 1. Authentication Security

| Threat | Mitigation |
|--------|-----------|
| **Token theft** | - HTTPS only<br>- Short-lived JWTs (1 hour)<br>- Secure storage (httpOnly cookies preferred, or localStorage with XSS protection) |
| **Token replay** | - JWT expiration<br>- Refresh token rotation<br>- Device fingerprinting (optional) |
| **XSS attacks** | - Content Security Policy<br>- Sanitize user inputs<br>- Use React's built-in XSS protection |
| **CSRF attacks** | - SameSite cookies<br>- CSRF tokens (if using cookies)<br>- Validate Origin/Referer headers |

### 2. API Security

```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining"],
)

# Trusted hosts (production only)
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[settings.API_DOMAIN]
    )

# Rate limiting on endpoints
@app.post("/api/v1/documents")
@limiter.limit("10/minute")
async def upload_document(...):
    ...
```

### 3. Data Security

- **Encryption at rest**: PostgreSQL TDE (Transparent Data Encryption)
- **Encryption in transit**: TLS 1.3 for all connections
- **Row-level security**: PostgreSQL RLS policies
- **Sensitive data**: Never log passwords, tokens, or PII
- **File uploads**: Virus scanning (ClamAV integration), file type validation

### 4. Supabase Security

- **API keys**: Use anon key for frontend (public), service_role key for backend admin operations (server-side only)
- **RLS policies**: Enable on all tables
- **Auth settings**: Configure password requirements, MFA, rate limiting

---

## Performance Optimization

### 1. Frontend Optimization

| Strategy | Implementation |
|----------|---------------|
| **Code splitting** | React.lazy() for route-based splitting |
| **Tree shaking** | Vite automatically removes unused code |
| **Asset optimization** | Image compression, lazy loading |
| **Caching** | React Query for server state, service worker for static assets |
| **Lazy loading** | Intersection Observer for images/components below fold |
| **Prefetching** | Prefetch critical API data on hover |

```typescript
// Lazy load routes
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Documents = React.lazy(() => import('./pages/Documents'))

// React Query caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
})
```

### 2. Backend Optimization

```python
# Database connection pooling
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

# Redis caching
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url(settings.REDIS_URL)
    FastAPICache.init(RedisBackend(redis), prefix="pka-cache:")

# Cached endpoint
from fastapi_cache.decorator import cache

@router.get("/dashboards/leader")
@cache(expire=300)  # 5 minutes
async def get_leader_dashboard(...):
    ...
```

### 3. Database Optimization

- **Indexes**: On foreign keys, frequently queried columns, vector embeddings
- **Partial indexes**: Filter out soft-deleted rows
- **Materialized views**: Pre-compute dashboard aggregations
- **Connection pooling**: PgBouncer for PostgreSQL
- **Query optimization**: Use EXPLAIN ANALYZE, add missing indexes

### 4. Vector Search Optimization

```sql
-- HNSW index for fast similarity search
CREATE INDEX idx_documents_embedding_hnsw
ON documents USING hnsw(embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Set ef_search for queries (higher = better recall, slower)
SET hnsw.ef_search = 100;

-- Optimized similarity query
SELECT id, title, embedding <=> $1 AS distance
FROM documents
WHERE organization_id = $2
  AND deleted_at IS NULL
ORDER BY embedding <=> $1
LIMIT 10;
```

---

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/yourorg/pka-strat.git
cd pka-strat

# 2. Set up Supabase project
# - Create project on supabase.com
# - Copy URL and anon key

# 3. Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy env example
cp .env.example .env
# Edit .env with your Supabase credentials

# Run migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload --port 8000

# In another terminal, start Celery
celery -A app.tasks.celery_app worker --loglevel=info

# 4. Frontend setup
cd ../frontend
npm install

# Copy env example
cp .env.example .env
# Edit .env with your Supabase credentials

# Start frontend
npm run dev

# Frontend runs on http://localhost:5173
# Backend API on http://localhost:8000
```

### Development Tools

| Tool | Purpose |
|------|---------|
| **VS Code** | Primary IDE |
| **Postman / Insomnia** | API testing |
| **Supabase Studio** | Database management, auth testing |
| **pgAdmin** | PostgreSQL administration |
| **RedisInsight** | Redis debugging |
| **React DevTools** | Frontend debugging |
| **Sentry** | Error tracking |

### Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/alignment-heatmap
# ... make changes ...
git add .
git commit -m "feat: Add alignment heatmap visualization"
git push origin feature/alignment-heatmap
# Create PR on GitHub
```

---

## Migration Path

### Phase 1: Foundation (Week 1-2)

- [ ] Set up Supabase project (auth, database)
- [ ] Create Lovable frontend project
- [ ] Set up FastAPI backend with PostgreSQL
- [ ] Implement JWT validation middleware
- [ ] Create basic auth flow (login, register, logout)

### Phase 2: Core Features (Week 3-4)

- [ ] Document upload and processing
- [ ] Pyramid of Clarity CRUD endpoints
- [ ] Basic dashboard views
- [ ] Alignment score calculation (v1)

### Phase 3: Advanced Features (Week 5-6)

- [ ] Vector search and semantic similarity
- [ ] Real-time WebSocket updates
- [ ] Strategic Resonance Engine
- [ ] Alignment heatmap visualization

### Phase 4: Polish & Deploy (Week 7-8)

- [ ] Production deployment setup
- [ ] Performance optimization
- [ ] Security audit
- [ ] User acceptance testing
- [ ] Documentation

---

## Conclusion

This architecture leverages:
- **Lovable** for rapid, AI-assisted frontend development
- **Supabase** for battle-tested auth and user management
- **FastAPI** for high-performance Python backend with AI/ML capabilities
- **PostgreSQL + RuVector** for unified relational, vector, and hypergraph storage

**Key Benefits**:
1. **Development Speed**: Lovable accelerates UI development; FastAPI provides auto-docs
2. **Proven Auth**: Supabase handles complex auth scenarios (OAuth, MFA, magic links)
3. **Flexibility**: Backend can scale independently; easy to add AI/ML features
4. **Cost-Effective**: Open-source stack; pay for managed services only (Supabase, hosting)
5. **Future-Proof**: Modular architecture allows swapping components as needed

**Trade-offs**:
- More complex than full-stack framework (Next.js)
- Multiple services to manage (Supabase, backend API, database)
- Requires coordination between frontend/backend teams

Overall, this hybrid architecture provides the best balance of **rapid development**, **scalability**, and **flexibility** for PKA-STRAT's strategic alignment intelligence platform.

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-29
**Status**: Architecture Design Complete
