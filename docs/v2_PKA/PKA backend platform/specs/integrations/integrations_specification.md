# PKA-STRAT Integrations Specification

**Version:** 1.0.0
**Date:** 2025-12-28
**Status:** Specification
**Author:** System Integration Architect

---

## Executive Summary

This specification defines the comprehensive integration architecture for PKA-STRAT, encompassing all external system connections, internal service communication patterns, and third-party tool integrations. PKA-STRAT's integration layer enables seamless data flow between organizational tools while maintaining the document-centric strategic alignment intelligence capabilities.

---

## Table of Contents

1. [Integration Architecture Overview](#1-integration-architecture-overview)
2. [Claude-Flow Integration](#2-claude-flow-integration)
3. [RuVector Integration](#3-ruvector-integration)
4. [External API Integrations](#4-external-api-integrations)
5. [Authentication Providers](#5-authentication-providers)
6. [Document Processing Pipeline Integration](#6-document-processing-pipeline-integration)
7. [Real-Time Communication](#7-real-time-communication)
8. [Notification Systems](#8-notification-systems)
9. [Export/Import Capabilities](#9-exportimport-capabilities)
10. [Third-Party Tool Integrations](#10-third-party-tool-integrations)
11. [Integration Security](#11-integration-security)
12. [Error Handling and Resilience](#12-error-handling-and-resilience)
13. [Monitoring and Observability](#13-monitoring-and-observability)

---

## 1. Integration Architecture Overview

### 1.1 High-Level Integration Diagram

```
                                    PKA-STRAT INTEGRATION LAYER

External Sources                    Internal Services                    External Targets
     |                                      |                                    |
     v                                      v                                    v
+-----------+     +------------------+   +------------------+   +------------------+
|  Market   |---->|  Document        |   | Strategic        |   | Notification     |
|  Data     |     |  Ingestion       |<->| Resonance        |-->| Services         |
|  Feeds    |     |  Pipeline        |   | Engine           |   | (Slack/Teams)    |
+-----------+     +------------------+   +------------------+   +------------------+
                           |                      |                       |
+-----------+              |                      |                       |
|  News     |--------------|                      |                       |
|  APIs     |              |                      |                       |
+-----------+              v                      v                       |
                  +------------------+   +------------------+              |
+-----------+     |  RuVector        |   | Pyramid          |              |
|  Project  |<--->|  Hypergraph      |<->| Mapping          |--------------|
|  Mgmt     |     |  Database        |   | Service          |              |
|  Tools    |     +------------------+   +------------------+              |
+-----------+              |                      |                       |
                           |                      |                       v
+-----------+              |                      |              +------------------+
|  Auth     |              |                      |              | Export           |
|  Providers|<-------------+----------------------+------------->| Services         |
|  (SSO)    |                                                    | (PDF/PPTX)       |
+-----------+                                                    +------------------+
                                      |
                    +------------------+------------------+
                    |                  |                  |
                    v                  v                  v
            +-------------+    +-------------+    +-------------+
            | Claude-Flow |    | WebSocket   |    | Redis       |
            | Swarm       |    | Server      |    | Pub/Sub     |
            | Orchestration|   | (Real-time) |    | (Events)    |
            +-------------+    +-------------+    +-------------+
```

### 1.2 Integration Design Principles

1. **API-First Design**: All integrations expose and consume well-defined APIs
2. **Loose Coupling**: Services communicate via events and messages where possible
3. **Fault Tolerance**: Circuit breakers, retries, and fallbacks for all external calls
4. **Security by Design**: OAuth2/JWT authentication, encrypted transport, audit logging
5. **Rate Limit Awareness**: Respect external API limits with intelligent throttling
6. **Data Sovereignty**: Document provenance and data lineage tracking
7. **Idempotency**: All integration operations are idempotent and safe to retry

### 1.3 Communication Patterns

| Pattern | Use Case | Technology |
|---------|----------|------------|
| **Synchronous REST** | User-initiated actions, CRUD operations | HTTPS + JSON |
| **Asynchronous Events** | Document processing, long-running analysis | RabbitMQ/Redis Streams |
| **Real-Time Push** | Dashboard updates, alerts | WebSocket/SSE |
| **Batch Processing** | Bulk imports, scheduled syncs | Celery + Redis |
| **Webhook Callbacks** | External system notifications | HTTPS + HMAC signatures |

---

## 2. Claude-Flow Integration

### 2.1 Overview

Claude-Flow provides swarm orchestration, memory management, and multi-agent coordination for PKA-STRAT's AI-powered strategic analysis capabilities.

### 2.2 Architecture

```
PKA-STRAT Application
        |
        v
+------------------+       +------------------+
|  Claude-Flow     |<----->|  Memory          |
|  Swarm           |       |  Coordination    |
|  Orchestration   |       |  (AgentDB)       |
+------------------+       +------------------+
        |                          |
        v                          v
+------------------+       +------------------+
|  Agent           |       |  ReasoningBank   |
|  Spawning        |       |  Pattern         |
|  (Multi-Agent)   |       |  Storage         |
+------------------+       +------------------+
```

### 2.3 Integration Points

#### 2.3.1 Swarm Orchestration

**Purpose**: Coordinate multiple AI agents for complex strategic analysis tasks

**Configuration**:
```yaml
claude_flow:
  swarm:
    topology: "hierarchical"  # or "mesh", "ring", "star"
    max_agents: 8
    strategy: "adaptive"

  agent_types:
    - coordinator
    - analyst
    - researcher
    - optimizer
    - reviewer
```

**API Integration**:
```python
from claude_flow import SwarmOrchestrator

class StrategicAnalysisSwarm:
    def __init__(self):
        self.orchestrator = SwarmOrchestrator(
            topology="hierarchical",
            max_agents=8
        )

    async def analyze_document(self, document_id: str):
        """Orchestrate multi-agent document analysis"""

        # Initialize swarm
        swarm_id = await self.orchestrator.swarm_init(
            topology="hierarchical",
            strategy="balanced"
        )

        # Spawn specialized agents
        await self.orchestrator.agent_spawn(
            swarm_id=swarm_id,
            type="researcher",
            name="document-researcher",
            capabilities=["document_analysis", "entity_extraction"]
        )

        await self.orchestrator.agent_spawn(
            swarm_id=swarm_id,
            type="analyst",
            name="strategic-analyst",
            capabilities=["alignment_scoring", "drift_detection"]
        )

        # Orchestrate task
        result = await self.orchestrator.task_orchestrate(
            task=f"Analyze document {document_id} for strategic alignment",
            strategy="adaptive",
            priority="high"
        )

        return result
```

#### 2.3.2 Memory Coordination

**Purpose**: Persist and retrieve agent memory across sessions

**Schema**:
```python
memory_operations = {
    "store": {
        "action": "store",
        "namespace": "strategic-analysis",
        "key": "document:{document_id}:analysis",
        "value": "<analysis_result>",
        "ttl": 86400  # 24 hours
    },
    "retrieve": {
        "action": "retrieve",
        "namespace": "strategic-analysis",
        "key": "document:{document_id}:analysis"
    },
    "search": {
        "action": "search",
        "pattern": "document:*:analysis",
        "limit": 100
    }
}
```

**Memory Namespaces**:
- `strategic-analysis`: Document analysis results
- `alignment-patterns`: Recognized alignment patterns
- `drift-history`: Historical drift detection data
- `user-context`: User session context

#### 2.3.3 Neural Pattern Training

**Purpose**: Train custom patterns for organization-specific alignment detection

```python
neural_training_config = {
    "pattern_type": "coordination",  # or "optimization", "prediction"
    "training_data": {
        "documents": ["doc_1", "doc_2", "doc_3"],
        "labels": ["aligned", "drifting", "aligned"]
    },
    "epochs": 50,
    "learning_rate": 0.001
}
```

### 2.4 Hooks Integration

Claude-Flow hooks enable pre/post task automation:

```yaml
hooks:
  pre_task:
    - name: "document_preparation"
      script: "npx claude-flow hooks pre-task --description 'Prepare document for analysis'"

  post_edit:
    - name: "memory_update"
      script: "npx claude-flow hooks post-edit --file {file} --memory-key 'swarm/analysis/{step}'"

  post_task:
    - name: "result_notification"
      script: "npx claude-flow hooks post-task --task-id {task_id}"
```

---

## 3. RuVector Integration

### 3.1 Overview

RuVector provides the semantic embedding and hypergraph infrastructure for PKA-STRAT's Strategic Resonance Engine. For complete details, see `/docs/v2_PKA/specs/integrations/ruvector_integration.md`.

### 3.2 Core Integration Points

#### 3.2.1 Embedding Generation Service

**Endpoint**: `POST /embed/document`

```python
class RuvectorEmbeddingClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {api_key}"}

    async def generate_embedding(
        self,
        text: str,
        doc_type: str,
        metadata: dict = None
    ) -> EmbeddingResult:
        """Generate Ruvector embedding for document text"""

        response = await self.client.post(
            f"{self.base_url}/embed/document",
            json={
                "text": text,
                "doc_type": doc_type,
                "metadata": metadata or {}
            },
            headers=self.headers
        )

        return EmbeddingResult(
            embedding=response["embedding"],
            dimension=response["dimension"],
            model=response["model"]
        )

    async def batch_embed(
        self,
        items: List[Dict[str, str]]
    ) -> List[EmbeddingResult]:
        """Batch embedding generation for multiple documents"""

        response = await self.client.post(
            f"{self.base_url}/embed/batch",
            json={"items": items},
            headers=self.headers
        )

        return [
            EmbeddingResult(
                id=item["id"],
                embedding=item["embedding"]
            )
            for item in response["embeddings"]
        ]
```

#### 3.2.2 Hypergraph Builder Service

**Endpoints**:
- `POST /hypergraph/add-node`: Add node to hypergraph
- `POST /hypergraph/add-edge`: Create relationships
- `POST /hypergraph/calculate-alignment`: Compute alignment scores
- `GET /hypergraph/traverse`: Navigate provenance paths

```python
class HypergraphClient:
    async def add_strategic_node(
        self,
        node_id: str,
        node_type: str,  # mission, objective, project, task
        embedding: List[float],
        pyramid_level: int,
        metadata: dict
    ) -> str:
        """Add strategic element as hypergraph node"""

        response = await self.client.post(
            f"{self.base_url}/hypergraph/add-node",
            json={
                "id": node_id,
                "type": node_type,
                "embedding": embedding,
                "pyramid_level": pyramid_level,
                "metadata": metadata
            }
        )

        return response["node_id"]

    async def calculate_alignment_score(
        self,
        source_node: str,
        target_nodes: List[str]
    ) -> AlignmentResult:
        """Calculate alignment between nodes"""

        response = await self.client.post(
            f"{self.base_url}/hypergraph/calculate-alignment",
            json={
                "source_node": source_node,
                "target_nodes": target_nodes
            }
        )

        return AlignmentResult(
            alignments=[
                {
                    "node": a["node"],
                    "score": a["score"],
                    "path": a["path"]
                }
                for a in response["alignments"]
            ]
        )

    async def get_provenance_path(
        self,
        start_node: str,
        end_node: str,
        max_depth: int = 8
    ) -> ProvenancePath:
        """Trace provenance from task to mission"""

        response = await self.client.get(
            f"{self.base_url}/hypergraph/traverse",
            params={
                "start": start_node,
                "end": end_node,
                "max_depth": max_depth
            }
        )

        return ProvenancePath(
            paths=response["paths"],
            l_score=response["provenance_score"]
        )
```

#### 3.2.3 Min-Cut Monitor Service

**Purpose**: Real-time mission drift detection

```python
class MinCutMonitorClient:
    async def start_monitoring(
        self,
        graph_id: str,
        threshold: float = 0.6,
        callback_url: str = None
    ) -> str:
        """Start continuous min-cut monitoring for drift detection"""

        response = await self.client.post(
            f"{self.base_url}/mincut/monitor/start",
            json={
                "graph_id": graph_id,
                "threshold": threshold,
                "callback_url": callback_url
            }
        )

        return response["monitor_id"]

    async def get_drift_status(
        self,
        monitor_id: str
    ) -> DriftStatus:
        """Get current mission drift status"""

        response = await self.client.get(
            f"{self.base_url}/mincut/status",
            params={"monitor_id": monitor_id}
        )

        return DriftStatus(
            mincut_value=response["mincut_value"],
            bottleneck_edges=response["bottleneck_edges"],
            integrity=response["integrity"]
        )
```

### 3.3 Vector Storage Configuration

```yaml
ruvector:
  vector_database:
    type: "ruvector"  # RuVector PostgreSQL extension (SIMD-accelerated, 77+ SQL functions)
    connection:
      host: "${RUVECTOR_HOST}"
      port: 5432
      database: "pka_strat_vectors"

    index:
      type: "hnsw"
      parameters:
        m: 16
        ef_construction: 64
        ef_search: 40

    dimensions: 3072  # text-embedding-3-large

  hypergraph:
    storage: "postgresql"
    graph_layer: "custom"

  cache:
    type: "redis"
    ttl_hours: 24
```

---

## 4. External API Integrations

### 4.1 Market Data Feeds

#### 4.1.1 Supported Providers

| Provider | Data Type | Update Frequency | Authentication |
|----------|-----------|------------------|----------------|
| Bloomberg | Financial data, market analytics | Real-time | API Key + OAuth2 |
| Reuters | News, market signals | Real-time | API Key |
| Alpha Vantage | Stock prices, fundamentals | 15-min delay | API Key |
| News API | Industry news | Hourly | API Key |
| Google Trends | Search trends | Daily | API Key |

#### 4.1.2 Market Data Integration Architecture

```python
class MarketDataIntegration:
    """Unified interface for market data feeds"""

    def __init__(self):
        self.providers = {
            "bloomberg": BloombergClient(),
            "reuters": ReutersClient(),
            "alpha_vantage": AlphaVantageClient(),
            "news_api": NewsAPIClient(),
        }
        self.rate_limiters = {
            name: RateLimiter(provider.rate_limit)
            for name, provider in self.providers.items()
        }

    async def fetch_market_signals(
        self,
        category: str,  # competitor, trend, regulation, technology
        industry: str,
        date_range: DateRange
    ) -> List[MarketSignal]:
        """Aggregate market signals from multiple providers"""

        tasks = []
        for name, provider in self.providers.items():
            if await self.rate_limiters[name].acquire():
                tasks.append(
                    provider.fetch_signals(category, industry, date_range)
                )

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Aggregate and deduplicate signals
        signals = []
        for result in results:
            if not isinstance(result, Exception):
                signals.extend(result)

        return self._deduplicate_and_rank(signals)

    async def analyze_competitor(
        self,
        competitor_name: str
    ) -> CompetitorAnalysis:
        """Fetch and analyze competitor intelligence"""

        # Fetch from multiple sources
        news = await self.providers["news_api"].search(competitor_name)
        financial = await self.providers["alpha_vantage"].get_company(competitor_name)
        trends = await self.providers["google_trends"].get_interest(competitor_name)

        return CompetitorAnalysis(
            news_mentions=len(news),
            sentiment=self._calculate_sentiment(news),
            financial_metrics=financial,
            trend_data=trends
        )
```

#### 4.1.3 News Feed Processing

```python
class NewsFeedProcessor:
    """Process and classify news for market intelligence"""

    async def process_feed(
        self,
        feed_url: str,
        organization_id: str
    ) -> List[MarketSignal]:
        """Ingest news feed and extract market signals"""

        articles = await self.fetch_feed(feed_url)

        signals = []
        for article in articles:
            # Classify relevance to organization
            relevance = await self.classify_relevance(
                article,
                organization_id
            )

            if relevance.score > 0.7:
                # Extract strategic implications
                signal = MarketSignal(
                    title=article.title,
                    category=relevance.category,
                    priority=relevance.priority,
                    source=article.source,
                    detected_at=datetime.utcnow(),
                    impact={
                        "score": relevance.impact_score,
                        "affected_areas": relevance.affected_areas
                    }
                )
                signals.append(signal)

        return signals

    async def classify_relevance(
        self,
        article: NewsArticle,
        organization_id: str
    ) -> RelevanceClassification:
        """Classify article relevance using AI"""

        # Get organization context
        org_context = await self.get_org_context(organization_id)

        # Use embedding similarity for classification
        article_embedding = await self.ruvector.embed(article.content)

        # Compare against organization's strategic objectives
        similarity = await self.ruvector.calculate_similarity(
            article_embedding,
            org_context.strategic_embeddings
        )

        return RelevanceClassification(
            score=similarity.max_score,
            category=self._determine_category(article),
            priority=self._determine_priority(similarity.max_score),
            impact_score=self._estimate_impact(article, org_context),
            affected_areas=similarity.matched_objectives
        )
```

### 4.2 Rate Limiting and Throttling

```python
class APIRateLimiter:
    """Token bucket rate limiter for external APIs"""

    def __init__(self, rate_limit: int, window_seconds: int = 60):
        self.rate_limit = rate_limit
        self.window_seconds = window_seconds
        self.redis = Redis()

    async def acquire(self, api_name: str) -> bool:
        """Attempt to acquire rate limit token"""

        key = f"rate_limit:{api_name}"
        current = await self.redis.incr(key)

        if current == 1:
            await self.redis.expire(key, self.window_seconds)

        if current > self.rate_limit:
            return False

        return True

    async def wait_and_acquire(
        self,
        api_name: str,
        timeout: int = 30
    ) -> bool:
        """Wait for rate limit token with timeout"""

        start = time.time()
        while time.time() - start < timeout:
            if await self.acquire(api_name):
                return True
            await asyncio.sleep(0.5)

        return False

# Configuration for external APIs
rate_limits = {
    "bloomberg": {"requests_per_minute": 60},
    "reuters": {"requests_per_minute": 100},
    "alpha_vantage": {"requests_per_minute": 5},
    "news_api": {"requests_per_minute": 100},
    "openai": {"requests_per_minute": 3000, "tokens_per_minute": 90000},
}
```

---

## 5. Authentication Providers

### 5.1 Authentication Architecture

```
                    +------------------+
                    |   API Gateway    |
                    |  (Auth Check)    |
                    +--------+---------+
                             |
              +-----------------------------+
              |              |              |
              v              v              v
     +--------+------+  +----+----+  +------+-------+
     |  JWT Token    |  |  OAuth2 |  |  API Key     |
     |  Validation   |  |  Flow   |  |  Auth        |
     +---------------+  +---------+  +--------------+
              |              |              |
              v              v              v
     +------------------+  +------------------+
     |  Local Auth      |  |  SSO Providers   |
     |  (email/password)|  |  (SAML/OIDC)     |
     +------------------+  +------------------+
```

### 5.2 OAuth2/OpenID Connect Integration

#### 5.2.1 Supported Providers

| Provider | Protocol | Use Case |
|----------|----------|----------|
| Google Workspace | OAuth2/OIDC | Google SSO for orgs using Google |
| Microsoft Entra ID | OAuth2/OIDC/SAML | Enterprise SSO for Microsoft shops |
| Okta | OAuth2/OIDC/SAML | Enterprise identity management |
| Auth0 | OAuth2/OIDC | Universal identity platform |
| OneLogin | OAuth2/OIDC/SAML | Enterprise SSO |

#### 5.2.2 OAuth2 Configuration

```python
oauth2_config = {
    "google": {
        "client_id": "${GOOGLE_CLIENT_ID}",
        "client_secret": "${GOOGLE_CLIENT_SECRET}",
        "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
        "scopes": ["openid", "profile", "email"],
        "redirect_uri": "https://app.pka-strat.com/auth/google/callback"
    },
    "microsoft": {
        "client_id": "${AZURE_CLIENT_ID}",
        "client_secret": "${AZURE_CLIENT_SECRET}",
        "authorization_url": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
        "scopes": ["openid", "profile", "email", "User.Read"],
        "redirect_uri": "https://app.pka-strat.com/auth/microsoft/callback"
    },
    "okta": {
        "issuer": "https://{org}.okta.com",
        "client_id": "${OKTA_CLIENT_ID}",
        "client_secret": "${OKTA_CLIENT_SECRET}",
        "scopes": ["openid", "profile", "email", "groups"],
        "redirect_uri": "https://app.pka-strat.com/auth/okta/callback"
    }
}
```

#### 5.2.3 SSO Integration Service

```python
class SSOIntegrationService:
    """Handle OAuth2/OIDC authentication flows"""

    def __init__(self, config: Dict):
        self.config = config
        self.providers = self._init_providers()

    async def initiate_login(
        self,
        provider: str,
        state: str,
        organization_id: Optional[str] = None
    ) -> str:
        """Generate OAuth2 authorization URL"""

        provider_config = self.config[provider]

        params = {
            "client_id": provider_config["client_id"],
            "redirect_uri": provider_config["redirect_uri"],
            "response_type": "code",
            "scope": " ".join(provider_config["scopes"]),
            "state": state,
            "nonce": secrets.token_urlsafe(16)
        }

        # Add org hint for multi-tenant providers
        if organization_id and provider == "microsoft":
            params["domain_hint"] = self._get_domain_hint(organization_id)

        return f"{provider_config['authorization_url']}?{urlencode(params)}"

    async def handle_callback(
        self,
        provider: str,
        code: str,
        state: str
    ) -> AuthResult:
        """Process OAuth2 callback and create session"""

        provider_config = self.config[provider]

        # Exchange code for tokens
        token_response = await self._exchange_code(provider, code)

        # Validate ID token
        id_token = token_response.get("id_token")
        if id_token:
            claims = await self._validate_id_token(provider, id_token)
        else:
            # Fetch user info
            claims = await self._fetch_userinfo(provider, token_response["access_token"])

        # Map claims to user
        user = await self._map_claims_to_user(claims, provider)

        # Create session
        session = await self._create_session(user, token_response)

        return AuthResult(
            user=user,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            expires_in=session.expires_in
        )

    async def _map_claims_to_user(
        self,
        claims: Dict,
        provider: str
    ) -> User:
        """Map SSO claims to internal user model"""

        # Standard OIDC claims mapping
        email = claims.get("email")
        name = claims.get("name") or f"{claims.get('given_name', '')} {claims.get('family_name', '')}"

        # Check if user exists
        existing_user = await self.user_service.get_by_email(email)

        if existing_user:
            # Update SSO linkage
            await self.user_service.link_sso(
                user_id=existing_user.id,
                provider=provider,
                provider_user_id=claims.get("sub")
            )
            return existing_user

        # Create new user
        return await self.user_service.create(
            email=email,
            name=name.strip(),
            auth_provider=provider,
            provider_user_id=claims.get("sub"),
            role=self._determine_role(claims)
        )
```

### 5.3 SAML 2.0 Integration

```python
class SAMLIntegrationService:
    """Handle SAML 2.0 SSO authentication"""

    def __init__(self, saml_settings: Dict):
        self.settings = saml_settings
        self.auth = OneLogin_Saml2_Auth(saml_settings)

    def generate_login_request(self) -> str:
        """Generate SAML authentication request"""
        return self.auth.login()

    async def process_response(
        self,
        saml_response: str,
        relay_state: str
    ) -> AuthResult:
        """Process SAML response from IdP"""

        self.auth.process_response()
        errors = self.auth.get_errors()

        if errors:
            raise SAMLAuthenticationError(errors)

        if not self.auth.is_authenticated():
            raise SAMLAuthenticationError("User not authenticated")

        # Extract attributes
        attributes = self.auth.get_attributes()
        name_id = self.auth.get_nameid()

        # Map to user
        user = await self._map_saml_to_user(name_id, attributes)

        # Create session
        session = await self._create_session(user)

        return AuthResult(
            user=user,
            access_token=session.access_token,
            refresh_token=session.refresh_token
        )
```

### 5.4 API Key Authentication

```python
class APIKeyAuthService:
    """API key authentication for service integrations"""

    async def create_api_key(
        self,
        user_id: str,
        name: str,
        scopes: List[str],
        expires_at: Optional[datetime] = None
    ) -> APIKeyWithSecret:
        """Generate new API key"""

        # Generate secure key
        key_id = str(uuid.uuid4())
        secret = secrets.token_urlsafe(32)
        hashed_secret = bcrypt.hashpw(secret.encode(), bcrypt.gensalt())

        # Store in database
        api_key = await self.db.insert("api_keys", {
            "id": key_id,
            "name": name,
            "user_id": user_id,
            "hashed_secret": hashed_secret.decode(),
            "scopes": scopes,
            "expires_at": expires_at,
            "created_at": datetime.utcnow()
        })

        # Return with secret (only shown once)
        return APIKeyWithSecret(
            id=key_id,
            name=name,
            scopes=scopes,
            secret=f"pk_live_{key_id}_{secret}",  # Full key for user
            created_at=api_key.created_at,
            expires_at=expires_at
        )

    async def validate_api_key(
        self,
        api_key: str
    ) -> Optional[APIKeyValidation]:
        """Validate API key and return associated user/scopes"""

        # Parse key format: pk_live_{key_id}_{secret}
        parts = api_key.split("_")
        if len(parts) != 4 or parts[0] != "pk" or parts[1] != "live":
            return None

        key_id = parts[2]
        secret = parts[3]

        # Fetch from database
        api_key_record = await self.db.get("api_keys", key_id)

        if not api_key_record:
            return None

        # Check expiration
        if api_key_record.expires_at and api_key_record.expires_at < datetime.utcnow():
            return None

        # Verify secret
        if not bcrypt.checkpw(secret.encode(), api_key_record.hashed_secret.encode()):
            return None

        # Update last used
        await self.db.update("api_keys", key_id, {"last_used_at": datetime.utcnow()})

        return APIKeyValidation(
            key_id=key_id,
            user_id=api_key_record.user_id,
            scopes=api_key_record.scopes
        )
```

---

## 6. Document Processing Pipeline Integration

### 6.1 Pipeline Architecture

```
Document Upload --> Validation --> Storage --> Processing Queue
                                                      |
                    +----------------------------------+
                    |
                    v
            +----------------+
            | Format         |
            | Detection &    |
            | Conversion     |
            +-------+--------+
                    |
        +-----------+-----------+
        |                       |
        v                       v
+---------------+       +----------------+
| Text          |       | OCR            |
| Extraction    |       | Processing     |
+-------+-------+       +--------+-------+
        |                        |
        +------------+-----------+
                     |
                     v
            +----------------+
            | Text           |
            | Normalization  |
            +-------+--------+
                    |
        +-----------+-----------+-----------+
        |           |           |           |
        v           v           v           v
+--------+  +--------+  +---------+  +--------+
|Document|  | Entity |  |Semantic |  | Story  |
|Classify|  |Extract |  |Chunking |  |Extract |
+---+----+  +---+----+  +----+----+  +---+----+
    |           |            |           |
    +-----+-----+-----+------+-----+-----+
          |           |            |
          v           v            v
   +------------+  +----------+  +------------+
   | Ruvector   |  |Hypergraph|  | L-Score    |
   | Embeddings |  |  Build   |  | Calculation|
   +------------+  +----------+  +------------+
```

### 6.2 Integration with Document Ingestion Service

For complete pipeline details, see `/docs/v2_PKA/specs/backend/document_ingestion_pipeline.md`.

#### 6.2.1 Upload Integration

```python
class DocumentUploadIntegration:
    """Integration layer for document uploads"""

    async def process_upload(
        self,
        file: UploadFile,
        document_type: str,
        metadata: Dict,
        user_id: str,
        organization_id: str
    ) -> DocumentUploadResult:
        """Handle document upload with full pipeline integration"""

        # Validate file
        await self._validate_file(file)

        # Store raw document
        storage_path = await self.object_storage.store(
            file=file,
            path=f"documents/{organization_id}/{uuid.uuid4()}/{file.filename}"
        )

        # Create document record
        document = await self.db.insert("documents", {
            "id": str(uuid.uuid4()),
            "title": metadata.get("title", file.filename),
            "file_name": file.filename,
            "file_size_bytes": file.size,
            "file_format": self._detect_format(file.filename),
            "uploaded_by": user_id,
            "uploaded_at": datetime.utcnow(),
            "document_type": document_type,
            "processing_status": "pending",
            "storage_path": storage_path,
            "metadata": metadata
        })

        # Queue for processing
        await self.processing_queue.enqueue({
            "task": "process_document",
            "document_id": document.id,
            "priority": self._determine_priority(document_type)
        })

        return DocumentUploadResult(
            document_id=document.id,
            status="processing",
            estimated_completion_seconds=self._estimate_processing_time(file.size)
        )
```

#### 6.2.2 Processing Integration

```python
class DocumentProcessingIntegration:
    """Coordinate document processing stages"""

    async def process_document(self, document_id: str):
        """Execute full document processing pipeline"""

        document = await self.db.get("documents", document_id)

        try:
            # Update status
            await self._update_status(document_id, "processing")

            # Stage 1: Format conversion
            raw_content = await self.object_storage.get(document.storage_path)
            text_content = await self.format_converter.convert(
                raw_content,
                document.file_format
            )

            # Stage 2: OCR if needed
            if self._needs_ocr(document.file_format, text_content):
                text_content = await self.ocr_service.process(raw_content)

            # Stage 3: Text normalization
            normalized_text = await self.text_normalizer.normalize(text_content)

            # Stage 4: Parallel processing
            results = await asyncio.gather(
                self._classify_document(normalized_text),
                self._extract_entities(normalized_text),
                self._chunk_document(normalized_text),
                self._extract_stories(normalized_text, document.document_type)
            )

            classification, entities, chunks, stories = results

            # Stage 5: Generate embeddings
            embeddings = await self.ruvector_client.batch_embed([
                {"id": chunk.id, "text": chunk.text}
                for chunk in chunks
            ])

            # Stage 6: Build hypergraph
            await self._build_hypergraph(document_id, chunks, embeddings, entities)

            # Stage 7: Calculate L-Score
            l_score = await self._calculate_l_score(document_id)

            # Update document with results
            await self.db.update("documents", document_id, {
                "processing_status": "completed",
                "document_type": classification.document_type,
                "pyramid_level": classification.pyramid_level,
                "l_score": l_score,
                "metadata": {
                    **document.metadata,
                    "chunk_count": len(chunks),
                    "entity_count": len(entities),
                    "story_count": len(stories)
                }
            })

            # Emit completion event
            await self.event_bus.publish("document.processed", {
                "document_id": document_id,
                "organization_id": document.organization_id,
                "l_score": l_score
            })

        except Exception as e:
            await self._update_status(document_id, "error", str(e))
            raise
```

### 6.3 Chunking Strategy Integration

```python
class ChunkingIntegration:
    """Document chunking with Ruvector optimization"""

    CHUNKING_STRATEGIES = {
        "mission_statement": {
            "method": "semantic_boundary",
            "max_tokens": 512,
            "overlap": 50
        },
        "project_plan": {
            "method": "section_based",
            "max_tokens": 1024,
            "overlap": 100
        },
        "research_report": {
            "method": "citation_aware",
            "max_tokens": 768,
            "overlap": 75
        }
    }

    async def chunk_document(
        self,
        text: str,
        document_type: str
    ) -> List[DocumentChunk]:
        """Chunk document using type-appropriate strategy"""

        strategy = self.CHUNKING_STRATEGIES.get(
            document_type,
            {"method": "paragraph_based", "max_tokens": 512, "overlap": 64}
        )

        if strategy["method"] == "semantic_boundary":
            return await self._semantic_chunking(text, strategy)
        elif strategy["method"] == "section_based":
            return await self._section_chunking(text, strategy)
        elif strategy["method"] == "citation_aware":
            return await self._citation_chunking(text, strategy)
        else:
            return await self._paragraph_chunking(text, strategy)
```

---

## 7. Real-Time Communication

### 7.1 WebSocket Architecture

```
Client (Browser)          Server (PKA-STRAT)          Backend Services
      |                          |                          |
      |------- Connect --------->|                          |
      |<------ Connected --------|                          |
      |                          |                          |
      |------- Subscribe ------->|                          |
      |     {channels: [...]}    |                          |
      |                          |                          |
      |                          |<----- Event Publish -----|
      |                          |   (alignment update)     |
      |<------ Push Event -------|                          |
      |    (alignment_update)    |                          |
      |                          |                          |
      |------- Heartbeat ------->|                          |
      |<------ Pong -------------|                          |
```

### 7.2 WebSocket Server Implementation

```python
class WebSocketServer:
    """Real-time WebSocket server for PKA-STRAT"""

    def __init__(self):
        self.connections: Dict[str, WebSocketConnection] = {}
        self.subscriptions: Dict[str, Set[str]] = {}  # channel -> connection_ids
        self.redis_pubsub = RedisPubSub()

    async def handle_connection(
        self,
        websocket: WebSocket,
        user_id: str,
        organization_id: str
    ):
        """Handle new WebSocket connection"""

        connection_id = str(uuid.uuid4())

        try:
            await websocket.accept()

            self.connections[connection_id] = WebSocketConnection(
                websocket=websocket,
                user_id=user_id,
                organization_id=organization_id,
                connected_at=datetime.utcnow()
            )

            # Start heartbeat
            asyncio.create_task(self._heartbeat_loop(connection_id))

            # Listen for messages
            async for message in websocket.iter_json():
                await self._handle_message(connection_id, message)

        except WebSocketDisconnect:
            await self._cleanup_connection(connection_id)

    async def _handle_message(self, connection_id: str, message: Dict):
        """Process incoming WebSocket message"""

        message_type = message.get("type")

        if message_type == "subscribe":
            await self._handle_subscribe(connection_id, message["channels"])

        elif message_type == "unsubscribe":
            await self._handle_unsubscribe(connection_id, message["channels"])

        elif message_type == "pong":
            self.connections[connection_id].last_pong = datetime.utcnow()

    async def _handle_subscribe(
        self,
        connection_id: str,
        channels: List[str]
    ):
        """Subscribe connection to channels"""

        connection = self.connections[connection_id]

        for channel in channels:
            # Validate channel access
            if await self._can_access_channel(connection, channel):
                if channel not in self.subscriptions:
                    self.subscriptions[channel] = set()
                self.subscriptions[channel].add(connection_id)

                # Subscribe to Redis channel
                await self.redis_pubsub.subscribe(
                    f"ws:{channel}",
                    lambda msg: self._broadcast_to_channel(channel, msg)
                )

    async def broadcast_alignment_update(
        self,
        organization_id: str,
        update: AlignmentUpdate
    ):
        """Broadcast alignment score update to subscribers"""

        channel = f"alignment:{organization_id}"

        message = {
            "type": "alignment_update",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "itemId": update.item_id,
                "level": update.level,
                "score": update.score,
                "previousScore": update.previous_score,
                "trend": update.trend
            }
        }

        # Publish to Redis (for multi-instance distribution)
        await self.redis_pubsub.publish(f"ws:{channel}", json.dumps(message))

    async def broadcast_drift_alert(
        self,
        organization_id: str,
        alert: DriftAlert
    ):
        """Broadcast mission drift alert to subscribers"""

        channel = f"drift:{organization_id}"

        message = {
            "type": "drift_alert",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "alertId": alert.id,
                "severity": alert.severity,
                "itemId": alert.item_id,
                "level": alert.level,
                "driftScore": alert.drift_score,
                "recommendations": alert.recommendations
            }
        }

        await self.redis_pubsub.publish(f"ws:{channel}", json.dumps(message))
```

### 7.3 Server-Sent Events (SSE) Alternative

```python
class SSEEventStream:
    """Server-Sent Events for simpler real-time updates"""

    async def stream_events(
        self,
        user_id: str,
        organization_id: str,
        event_types: List[str]
    ) -> AsyncGenerator[str, None]:
        """Generate SSE event stream"""

        # Subscribe to Redis channels
        channels = [
            f"events:{organization_id}:{event_type}"
            for event_type in event_types
        ]

        pubsub = self.redis.pubsub()
        await pubsub.subscribe(*channels)

        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    event_data = json.loads(message["data"])

                    # Format as SSE
                    yield f"event: {event_data['type']}\n"
                    yield f"data: {json.dumps(event_data['data'])}\n\n"

        finally:
            await pubsub.unsubscribe(*channels)
```

### 7.4 Redis Pub/Sub Integration

```python
class RedisPubSubIntegration:
    """Redis Pub/Sub for distributed event broadcasting"""

    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url)
        self.pubsub = self.redis.pubsub()
        self.handlers: Dict[str, Callable] = {}

    async def publish(self, channel: str, message: str):
        """Publish message to Redis channel"""
        await self.redis.publish(channel, message)

    async def subscribe(self, channel: str, handler: Callable):
        """Subscribe to Redis channel with handler"""
        await self.pubsub.subscribe(channel)
        self.handlers[channel] = handler

    async def start_listener(self):
        """Start listening for Redis messages"""
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                channel = message["channel"].decode()
                data = message["data"].decode()

                if channel in self.handlers:
                    await self.handlers[channel](json.loads(data))
```

---

## 8. Notification Systems

### 8.1 Notification Architecture

```
Event Sources                 Notification Service                Delivery Channels
     |                              |                                    |
     v                              v                                    v
+----------+    +------------------+------------------+    +----------------+
| Alignment|    |  Event          |  Notification    |    | WebSocket      |
| Updates  |--->|  Router         |  Processor       |--->| (Real-time)    |
+----------+    +--------+--------+---------+--------+    +----------------+
                         |                  |              +----------------+
+----------+             |                  |              | Email          |
| Drift    |-------------+                  +------------->| (Transactional)|
| Alerts   |             |                                 +----------------+
+----------+             |                                 +----------------+
                         |                                 | Slack          |
+----------+             |                                 | Integration    |
| Document |-------------+                                 +----------------+
| Updates  |                                               +----------------+
+----------+                                               | MS Teams       |
                                                           | Integration    |
                                                           +----------------+
                                                           +----------------+
                                                           | Push           |
                                                           | Notifications  |
                                                           +----------------+
```

### 8.2 Notification Service Implementation

```python
class NotificationService:
    """Centralized notification management"""

    def __init__(self):
        self.channels = {
            "websocket": WebSocketChannel(),
            "email": EmailChannel(),
            "slack": SlackChannel(),
            "teams": TeamsChannel(),
            "push": PushNotificationChannel()
        }
        self.preference_service = UserPreferenceService()

    async def send_notification(
        self,
        notification: Notification
    ):
        """Send notification through appropriate channels"""

        # Get user preferences
        preferences = await self.preference_service.get(notification.user_id)

        # Determine delivery channels based on notification type and preferences
        channels = self._select_channels(notification, preferences)

        # Send to each channel
        results = await asyncio.gather(*[
            self.channels[channel].send(notification)
            for channel in channels
        ], return_exceptions=True)

        # Log delivery results
        await self._log_delivery(notification, channels, results)

    async def send_bulk_notification(
        self,
        notification_template: NotificationTemplate,
        user_ids: List[str]
    ):
        """Send notification to multiple users"""

        for batch in self._batch_users(user_ids, 100):
            tasks = [
                self.send_notification(
                    Notification(
                        user_id=user_id,
                        **notification_template.dict()
                    )
                )
                for user_id in batch
            ]
            await asyncio.gather(*tasks)

    def _select_channels(
        self,
        notification: Notification,
        preferences: UserPreferences
    ) -> List[str]:
        """Select delivery channels based on notification type"""

        channel_map = {
            "drift_alert_critical": ["websocket", "email", "slack", "push"],
            "drift_alert_high": ["websocket", "email", "slack"],
            "drift_alert_medium": ["websocket", "email"],
            "drift_alert_low": ["websocket"],
            "alignment_update": ["websocket"],
            "document_processed": ["websocket", "email"],
            "strategic_change": ["websocket", "email", "slack"],
        }

        default_channels = channel_map.get(notification.type, ["websocket"])

        # Filter by user preferences
        return [
            channel for channel in default_channels
            if preferences.is_channel_enabled(channel, notification.type)
        ]
```

### 8.3 Slack Integration

```python
class SlackChannel:
    """Slack notification delivery"""

    def __init__(self):
        self.client = AsyncWebClient(token=os.environ["SLACK_BOT_TOKEN"])

    async def send(self, notification: Notification) -> DeliveryResult:
        """Send notification to Slack"""

        user = await self.user_service.get(notification.user_id)
        slack_user_id = await self._get_slack_user_id(user.email)

        if not slack_user_id:
            return DeliveryResult(success=False, error="No Slack user found")

        # Format message
        blocks = self._format_slack_blocks(notification)

        try:
            response = await self.client.chat_postMessage(
                channel=slack_user_id,
                text=notification.title,
                blocks=blocks
            )

            return DeliveryResult(
                success=True,
                message_id=response["ts"]
            )

        except SlackApiError as e:
            return DeliveryResult(success=False, error=str(e))

    def _format_slack_blocks(self, notification: Notification) -> List[Dict]:
        """Format notification as Slack Block Kit"""

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": notification.title
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": notification.body
                }
            }
        ]

        if notification.type.startswith("drift_alert"):
            # Add severity indicator
            severity_emoji = {
                "critical": ":red_circle:",
                "high": ":large_orange_circle:",
                "medium": ":large_yellow_circle:",
                "low": ":white_circle:"
            }

            blocks.append({
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"{severity_emoji.get(notification.severity, ':white_circle:')} Severity: *{notification.severity.upper()}*"
                    }
                ]
            })

        # Add action buttons
        if notification.actions:
            blocks.append({
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": action.label},
                        "url": action.url,
                        "action_id": action.id
                    }
                    for action in notification.actions
                ]
            })

        return blocks
```

### 8.4 Microsoft Teams Integration

```python
class TeamsChannel:
    """Microsoft Teams notification delivery"""

    async def send(self, notification: Notification) -> DeliveryResult:
        """Send notification to Microsoft Teams"""

        user = await self.user_service.get(notification.user_id)
        teams_webhook_url = await self._get_teams_webhook(user.organization_id)

        if not teams_webhook_url:
            return DeliveryResult(success=False, error="No Teams webhook configured")

        # Format as Adaptive Card
        card = self._format_adaptive_card(notification)

        try:
            response = await self.http_client.post(
                teams_webhook_url,
                json=card
            )

            if response.status_code == 200:
                return DeliveryResult(success=True)
            else:
                return DeliveryResult(
                    success=False,
                    error=f"Teams API error: {response.status_code}"
                )

        except Exception as e:
            return DeliveryResult(success=False, error=str(e))

    def _format_adaptive_card(self, notification: Notification) -> Dict:
        """Format notification as Microsoft Adaptive Card"""

        return {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "contentUrl": None,
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": [
                            {
                                "type": "TextBlock",
                                "size": "Large",
                                "weight": "Bolder",
                                "text": notification.title
                            },
                            {
                                "type": "TextBlock",
                                "text": notification.body,
                                "wrap": True
                            }
                        ],
                        "actions": [
                            {
                                "type": "Action.OpenUrl",
                                "title": action.label,
                                "url": action.url
                            }
                            for action in (notification.actions or [])
                        ]
                    }
                }
            ]
        }
```

### 8.5 Email Notifications

```python
class EmailChannel:
    """Email notification delivery"""

    def __init__(self):
        self.client = SendGridClient(api_key=os.environ["SENDGRID_API_KEY"])

    async def send(self, notification: Notification) -> DeliveryResult:
        """Send email notification"""

        user = await self.user_service.get(notification.user_id)

        # Select template
        template_id = self._get_template(notification.type)

        message = Mail(
            from_email="notifications@pka-strat.com",
            to_emails=user.email,
            subject=notification.title
        )

        message.template_id = template_id
        message.dynamic_template_data = {
            "title": notification.title,
            "body": notification.body,
            "severity": notification.severity,
            "actions": [
                {"label": a.label, "url": a.url}
                for a in (notification.actions or [])
            ],
            "timestamp": notification.created_at.isoformat()
        }

        try:
            response = await self.client.send(message)
            return DeliveryResult(
                success=response.status_code in [200, 202],
                message_id=response.headers.get("X-Message-Id")
            )
        except Exception as e:
            return DeliveryResult(success=False, error=str(e))
```

---

## 9. Export/Import Capabilities

### 9.1 Export Architecture

```
Export Request --> Format Selection --> Data Aggregation --> Transformation
                                                                    |
                    +-----------------------------------------------+
                    |
                    v
            +---------------+
            | Format        |
            | Generators    |
            +-------+-------+
                    |
    +---------------+---------------+---------------+
    |               |               |               |
    v               v               v               v
+-------+       +-------+       +-------+       +-------+
|  PDF  |       | PPTX  |       |  CSV  |       |  JSON |
+-------+       +-------+       +-------+       +-------+
    |               |               |               |
    +---------------+---------------+---------------+
                    |
                    v
            +---------------+
            | Local Storage |
            | (./exports/)  |
            +-------+-------+
                    |
                    v
            +---------------+
            | Download URL  |
            | Generation    |
            +---------------+
```

### 9.2 Export Service Implementation

```python
class ExportService:
    """Document and report export functionality"""

    EXPORT_FORMATS = {
        "pdf": PDFExporter,
        "pptx": PowerPointExporter,
        "xlsx": ExcelExporter,
        "csv": CSVExporter,
        "json": JSONExporter,
        "html": HTMLExporter
    }

    async def generate_report(
        self,
        report_type: str,
        format: str,
        options: ReportOptions,
        user_id: str
    ) -> ExportResult:
        """Generate and export report"""

        # Create export job
        job_id = str(uuid.uuid4())

        await self.db.insert("export_jobs", {
            "id": job_id,
            "report_type": report_type,
            "format": format,
            "status": "processing",
            "user_id": user_id,
            "created_at": datetime.utcnow()
        })

        try:
            # Aggregate data
            data = await self._aggregate_report_data(report_type, options)

            # Generate export
            exporter = self.EXPORT_FORMATS[format]()
            file_content = await exporter.generate(data, options)

            # Store locally
            file_key = f"exports/{user_id}/{job_id}.{format}"
            await self.storage.save_file(
                path=f"./data/{file_key}",
                content=file_content,
                content_type=exporter.content_type
            )

            # Generate download URL (local API endpoint)
            download_url = f"/api/v1/exports/{job_id}/download"
            # URL expires after 1 hour (validated by server)

            # Update job status
            await self.db.update("export_jobs", job_id, {
                "status": "completed",
                "download_url": download_url,
                "expires_at": datetime.utcnow() + timedelta(hours=1),
                "completed_at": datetime.utcnow()
            })

            return ExportResult(
                job_id=job_id,
                status="completed",
                download_url=download_url,
                expires_at=datetime.utcnow() + timedelta(hours=1)
            )

        except Exception as e:
            await self.db.update("export_jobs", job_id, {
                "status": "failed",
                "error": str(e)
            })
            raise

    async def generate_board_deck(
        self,
        options: BoardDeckOptions,
        user_id: str
    ) -> ExportResult:
        """Generate executive board deck with strategic narrative"""

        # Gather data for each section
        sections_data = {}

        if "mission" in options.include_sections:
            sections_data["mission"] = await self._get_mission_data(options)

        if "alignment" in options.include_sections:
            sections_data["alignment"] = await self._get_alignment_data(options)

        if "market" in options.include_sections:
            sections_data["market"] = await self._get_market_intelligence(options)

        # Generate narratives using AI
        narratives = await self._generate_narratives(sections_data)

        # Create deck
        deck_data = BoardDeckData(
            sections=sections_data,
            narratives=narratives,
            time_range=options.time_range
        )

        return await self.generate_report(
            report_type="board_deck",
            format=options.format,
            options=deck_data,
            user_id=user_id
        )
```

### 9.3 PDF Exporter

```python
class PDFExporter:
    """Generate PDF exports"""

    content_type = "application/pdf"

    async def generate(
        self,
        data: Dict,
        options: ExportOptions
    ) -> bytes:
        """Generate PDF from report data"""

        # Use ReportLab or WeasyPrint
        from weasyprint import HTML, CSS

        # Render HTML template
        html_content = await self.render_template(
            f"reports/{options.report_type}.html",
            data=data,
            options=options
        )

        # Apply styling
        css = CSS(string=self._get_pdf_styles())

        # Generate PDF
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf(stylesheets=[css])

        return pdf_bytes

    def _get_pdf_styles(self) -> str:
        """Get PDF-specific CSS styles"""

        return """
        @page {
            size: A4;
            margin: 2cm;
            @top-right {
                content: "PKA-STRAT Report";
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
            }
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
        }
        h1 { font-size: 24pt; color: #1a1a2e; }
        h2 { font-size: 18pt; color: #16213e; }
        .chart { page-break-inside: avoid; }
        .table { page-break-inside: avoid; }
        """
```

### 9.4 Import Service

```python
class ImportService:
    """Bulk data import functionality"""

    IMPORT_HANDLERS = {
        "pyramid_csv": PyramidCSVImporter,
        "strategic_plan": StrategicPlanImporter,
        "okr_json": OKRJSONImporter,
        "asana_export": AsanaExportImporter,
        "jira_export": JiraExportImporter
    }

    async def process_import(
        self,
        file: UploadFile,
        import_type: str,
        options: ImportOptions,
        user_id: str
    ) -> ImportResult:
        """Process bulk import"""

        job_id = str(uuid.uuid4())

        # Create import job
        await self.db.insert("import_jobs", {
            "id": job_id,
            "import_type": import_type,
            "status": "processing",
            "user_id": user_id,
            "created_at": datetime.utcnow()
        })

        try:
            # Parse file
            handler = self.IMPORT_HANDLERS[import_type]()
            parsed_data = await handler.parse(file)

            # Validate data
            validation_result = await handler.validate(parsed_data, options)

            if not validation_result.is_valid:
                await self.db.update("import_jobs", job_id, {
                    "status": "validation_failed",
                    "errors": validation_result.errors
                })
                return ImportResult(
                    job_id=job_id,
                    status="validation_failed",
                    errors=validation_result.errors
                )

            # Import data
            import_stats = await handler.import_data(
                parsed_data,
                options,
                user_id
            )

            # Update job status
            await self.db.update("import_jobs", job_id, {
                "status": "completed",
                "stats": import_stats.dict(),
                "completed_at": datetime.utcnow()
            })

            return ImportResult(
                job_id=job_id,
                status="completed",
                stats=import_stats
            )

        except Exception as e:
            await self.db.update("import_jobs", job_id, {
                "status": "failed",
                "error": str(e)
            })
            raise
```

---

## 10. Third-Party Tool Integrations

### 10.1 Project Management Tools

#### 10.1.1 Asana Integration

```python
class AsanaIntegration:
    """Bi-directional Asana integration"""

    def __init__(self, access_token: str):
        self.client = asana.Client.access_token(access_token)

    async def sync_workspace(
        self,
        workspace_gid: str,
        organization_id: str
    ) -> SyncResult:
        """Sync Asana workspace with PKA-STRAT pyramid"""

        # Fetch Asana data
        projects = list(self.client.projects.find_all({"workspace": workspace_gid}))

        sync_stats = SyncStats()

        for project in projects:
            # Map Asana project to pyramid node
            pyramid_level = self._determine_pyramid_level(project)

            # Check if exists in PKA-STRAT
            existing_node = await self.pyramid_service.find_by_external_id(
                "asana",
                project["gid"]
            )

            if existing_node:
                # Update existing node
                await self.pyramid_service.update(
                    existing_node.id,
                    {
                        "title": project["name"],
                        "metadata": self._extract_metadata(project)
                    }
                )
                sync_stats.updated += 1
            else:
                # Create new node
                await self.pyramid_service.create({
                    "title": project["name"],
                    "level": pyramid_level,
                    "external_source": "asana",
                    "external_id": project["gid"],
                    "metadata": self._extract_metadata(project)
                })
                sync_stats.created += 1

            # Sync tasks within project
            await self._sync_project_tasks(project["gid"], organization_id)

        return SyncResult(stats=sync_stats)

    async def setup_webhooks(
        self,
        workspace_gid: str,
        callback_url: str
    ):
        """Configure Asana webhooks for real-time sync"""

        # Create webhook for project changes
        self.client.webhooks.create({
            "resource": workspace_gid,
            "target": callback_url,
            "filters": [
                {"resource_type": "project", "action": "changed"},
                {"resource_type": "task", "action": "changed"},
                {"resource_type": "task", "action": "added"},
                {"resource_type": "task", "action": "deleted"}
            ]
        })

    async def handle_webhook(
        self,
        webhook_data: Dict
    ):
        """Process incoming Asana webhook"""

        events = webhook_data.get("events", [])

        for event in events:
            resource_type = event.get("resource", {}).get("resource_type")
            action = event.get("action")

            if resource_type == "project":
                await self._handle_project_event(event)
            elif resource_type == "task":
                await self._handle_task_event(event)
```

#### 10.1.2 Jira Integration

```python
class JiraIntegration:
    """Jira project management integration"""

    def __init__(self, jira_url: str, api_token: str, email: str):
        self.jira = JIRA(
            server=jira_url,
            basic_auth=(email, api_token)
        )

    async def sync_project(
        self,
        project_key: str,
        organization_id: str
    ) -> SyncResult:
        """Sync Jira project with PKA-STRAT"""

        # Fetch epics (map to Programs)
        epics = self.jira.search_issues(
            f'project = {project_key} AND issuetype = Epic'
        )

        for epic in epics:
            await self._sync_epic(epic, organization_id)

        # Fetch stories/tasks
        issues = self.jira.search_issues(
            f'project = {project_key} AND issuetype in (Story, Task, Bug)'
        )

        for issue in issues:
            await self._sync_issue(issue, organization_id)

        return SyncResult(synced=len(epics) + len(issues))

    async def _sync_epic(self, epic, organization_id: str):
        """Sync Jira epic as Program in pyramid"""

        pyramid_node = await self.pyramid_service.upsert({
            "external_source": "jira",
            "external_id": epic.key,
            "title": epic.fields.summary,
            "description": epic.fields.description,
            "level": "program",
            "status": self._map_status(epic.fields.status.name),
            "metadata": {
                "jira_key": epic.key,
                "jira_url": f"{self.jira_url}/browse/{epic.key}",
                "priority": epic.fields.priority.name if epic.fields.priority else None
            }
        })

        return pyramid_node
```

### 10.2 Document Repositories

#### 10.2.1 Google Drive Integration

```python
class GoogleDriveIntegration:
    """Google Drive document synchronization"""

    def __init__(self, credentials: Credentials):
        self.service = build("drive", "v3", credentials=credentials)

    async def setup_watch(
        self,
        folder_id: str,
        organization_id: str
    ):
        """Set up Google Drive folder watch for auto-ingestion"""

        # Create notification channel
        channel_id = str(uuid.uuid4())

        body = {
            "id": channel_id,
            "type": "web_hook",
            "address": f"https://api.pka-strat.com/webhooks/gdrive/{organization_id}",
            "token": secrets.token_urlsafe(32)
        }

        response = self.service.files().watch(
            fileId=folder_id,
            body=body
        ).execute()

        # Store channel details
        await self.db.insert("drive_channels", {
            "channel_id": channel_id,
            "folder_id": folder_id,
            "organization_id": organization_id,
            "resource_id": response["resourceId"],
            "expiration": response["expiration"]
        })

    async def sync_folder(
        self,
        folder_id: str,
        organization_id: str
    ) -> SyncResult:
        """Sync all documents in folder"""

        results = self.service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            fields="files(id, name, mimeType, modifiedTime)"
        ).execute()

        sync_stats = SyncStats()

        for file in results.get("files", []):
            if self._is_supported_document(file["mimeType"]):
                # Check if already ingested
                existing = await self.document_service.find_by_external_id(
                    "google_drive",
                    file["id"]
                )

                if existing:
                    # Check if modified
                    if file["modifiedTime"] > existing.external_modified_at:
                        await self._reingest_document(file, organization_id)
                        sync_stats.updated += 1
                else:
                    await self._ingest_document(file, organization_id)
                    sync_stats.created += 1

        return SyncResult(stats=sync_stats)

    async def _ingest_document(self, file: Dict, organization_id: str):
        """Download and ingest document from Google Drive"""

        # Download file content
        request = self.service.files().get_media(fileId=file["id"])
        content = io.BytesIO()
        downloader = MediaIoBaseDownload(content, request)

        done = False
        while not done:
            _, done = downloader.next_chunk()

        content.seek(0)

        # Ingest through document pipeline
        await self.document_ingestion.process_upload(
            file=UploadFile(
                filename=file["name"],
                file=content,
                content_type=file["mimeType"]
            ),
            document_type=self._infer_document_type(file),
            metadata={
                "source": "google_drive",
                "drive_file_id": file["id"],
                "original_name": file["name"]
            },
            organization_id=organization_id
        )
```

#### 10.2.2 SharePoint Integration

```python
class SharePointIntegration:
    """Microsoft SharePoint document synchronization"""

    def __init__(self, tenant_id: str, client_id: str, client_secret: str):
        self.graph_client = GraphServiceClient(
            credentials=ClientSecretCredential(
                tenant_id=tenant_id,
                client_id=client_id,
                client_secret=client_secret
            )
        )

    async def sync_library(
        self,
        site_id: str,
        library_id: str,
        organization_id: str
    ) -> SyncResult:
        """Sync SharePoint document library"""

        # Get library items
        items = await self.graph_client.sites.by_site_id(site_id) \
            .drives.by_drive_id(library_id) \
            .root.children.get()

        sync_stats = SyncStats()

        for item in items.value:
            if item.file:  # Is a file, not a folder
                await self._sync_document(item, organization_id)
                sync_stats.created += 1

        return SyncResult(stats=sync_stats)

    async def setup_subscription(
        self,
        site_id: str,
        library_id: str,
        organization_id: str
    ):
        """Create Graph subscription for real-time updates"""

        subscription = Subscription(
            change_type="created,updated,deleted",
            notification_url=f"https://api.pka-strat.com/webhooks/sharepoint/{organization_id}",
            resource=f"/sites/{site_id}/drives/{library_id}/root",
            expiration_date_time=datetime.utcnow() + timedelta(days=2),
            client_state=secrets.token_urlsafe(32)
        )

        result = await self.graph_client.subscriptions.post(subscription)

        await self.db.insert("sharepoint_subscriptions", {
            "subscription_id": result.id,
            "site_id": site_id,
            "library_id": library_id,
            "organization_id": organization_id,
            "expiration": result.expiration_date_time
        })
```

### 10.3 Communication Platforms

#### 10.3.1 Slack App Integration

```python
class SlackAppIntegration:
    """Full Slack app integration with commands and events"""

    def __init__(self):
        self.client = AsyncWebClient(token=os.environ["SLACK_BOT_TOKEN"])
        self.signing_secret = os.environ["SLACK_SIGNING_SECRET"]

    async def handle_slash_command(
        self,
        command: str,
        text: str,
        user_id: str,
        channel_id: str
    ):
        """Handle Slack slash commands"""

        if command == "/pka-alignment":
            return await self._get_alignment_summary(user_id)

        elif command == "/pka-search":
            return await self._search_strategic_items(text)

        elif command == "/pka-drift":
            return await self._get_drift_alerts()

    async def _get_alignment_summary(self, slack_user_id: str) -> Dict:
        """Return alignment summary for user"""

        # Map Slack user to PKA-STRAT user
        user = await self.user_service.find_by_slack_id(slack_user_id)

        if not user:
            return {
                "response_type": "ephemeral",
                "text": "Please link your Slack account to PKA-STRAT first."
            }

        # Get alignment data
        alignment = await self.analytics_service.get_user_alignment(user.id)

        return {
            "response_type": "in_channel",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "Strategic Alignment Summary"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Overall Alignment:* {alignment.overall_score:.1%}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Active Projects:* {alignment.active_projects}"
                        }
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"<https://app.pka-strat.com/dashboard|View Full Dashboard>"
                    }
                }
            ]
        }
```

---

## 11. Integration Security

### 11.1 API Security

```python
class IntegrationSecurityMiddleware:
    """Security middleware for all integrations"""

    async def validate_request(
        self,
        request: Request,
        integration_type: str
    ) -> bool:
        """Validate incoming integration request"""

        # Validate HTTPS
        if request.url.scheme != "https" and not settings.DEBUG:
            raise SecurityError("HTTPS required")

        # Validate signature for webhooks
        if integration_type in ["slack", "asana", "jira", "github"]:
            await self._validate_webhook_signature(request, integration_type)

        # Validate API key for direct integrations
        if integration_type in ["external_api"]:
            await self._validate_api_key(request)

        # Rate limiting
        await self._check_rate_limit(request, integration_type)

        return True

    async def _validate_webhook_signature(
        self,
        request: Request,
        integration_type: str
    ):
        """Validate webhook signature"""

        body = await request.body()

        if integration_type == "slack":
            signature = request.headers.get("X-Slack-Signature")
            timestamp = request.headers.get("X-Slack-Request-Timestamp")

            expected = self._compute_slack_signature(timestamp, body)

            if not hmac.compare_digest(signature, expected):
                raise SecurityError("Invalid Slack signature")

        elif integration_type == "github":
            signature = request.headers.get("X-Hub-Signature-256")
            expected = self._compute_github_signature(body)

            if not hmac.compare_digest(signature, expected):
                raise SecurityError("Invalid GitHub signature")
```

### 11.2 Credential Management

```python
class CredentialManager:
    """Secure credential storage and retrieval"""

    def __init__(self):
        self.kms = boto3.client("kms")
        self.secrets_manager = boto3.client("secretsmanager")

    async def store_integration_credentials(
        self,
        organization_id: str,
        integration_type: str,
        credentials: Dict
    ):
        """Store encrypted integration credentials"""

        secret_name = f"pka-strat/{organization_id}/{integration_type}"

        # Encrypt sensitive fields
        encrypted_creds = {}
        for key, value in credentials.items():
            if key in ["api_key", "secret", "token", "password"]:
                encrypted_creds[key] = await self._encrypt(value)
            else:
                encrypted_creds[key] = value

        # Store in Secrets Manager
        await self.secrets_manager.create_secret(
            Name=secret_name,
            SecretString=json.dumps(encrypted_creds)
        )

    async def get_integration_credentials(
        self,
        organization_id: str,
        integration_type: str
    ) -> Dict:
        """Retrieve and decrypt integration credentials"""

        secret_name = f"pka-strat/{organization_id}/{integration_type}"

        response = await self.secrets_manager.get_secret_value(
            SecretId=secret_name
        )

        encrypted_creds = json.loads(response["SecretString"])

        # Decrypt sensitive fields
        credentials = {}
        for key, value in encrypted_creds.items():
            if key in ["api_key", "secret", "token", "password"]:
                credentials[key] = await self._decrypt(value)
            else:
                credentials[key] = value

        return credentials

    async def _encrypt(self, plaintext: str) -> str:
        """Encrypt using KMS"""

        response = await self.kms.encrypt(
            KeyId=os.environ["KMS_KEY_ID"],
            Plaintext=plaintext.encode()
        )

        return base64.b64encode(response["CiphertextBlob"]).decode()

    async def _decrypt(self, ciphertext: str) -> str:
        """Decrypt using KMS"""

        response = await self.kms.decrypt(
            CiphertextBlob=base64.b64decode(ciphertext)
        )

        return response["Plaintext"].decode()
```

---

## 12. Error Handling and Resilience

### 12.1 Circuit Breaker Pattern

```python
class CircuitBreaker:
    """Circuit breaker for external service calls"""

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        half_open_requests: int = 3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_requests = half_open_requests
        self.state = "closed"
        self.failure_count = 0
        self.last_failure_time = None
        self.success_count = 0

    async def call(
        self,
        func: Callable,
        *args,
        **kwargs
    ):
        """Execute function with circuit breaker protection"""

        if self.state == "open":
            if self._should_try_recovery():
                self.state = "half-open"
                self.success_count = 0
            else:
                raise CircuitOpenError("Circuit breaker is open")

        try:
            result = await func(*args, **kwargs)

            if self.state == "half-open":
                self.success_count += 1
                if self.success_count >= self.half_open_requests:
                    self.state = "closed"
                    self.failure_count = 0

            return result

        except Exception as e:
            self._handle_failure()
            raise

    def _handle_failure(self):
        """Handle failed call"""

        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()

        if self.failure_count >= self.failure_threshold:
            self.state = "open"

    def _should_try_recovery(self) -> bool:
        """Check if enough time has passed for recovery attempt"""

        if not self.last_failure_time:
            return True

        elapsed = (datetime.utcnow() - self.last_failure_time).total_seconds()
        return elapsed >= self.recovery_timeout

# Usage
ruvector_circuit = CircuitBreaker(failure_threshold=5, recovery_timeout=30)

async def generate_embedding(text: str):
    return await ruvector_circuit.call(
        ruvector_client.generate_embedding,
        text=text
    )
```

### 12.2 Retry Logic

```python
class RetryHandler:
    """Configurable retry logic for integration calls"""

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter

    async def execute(
        self,
        func: Callable,
        *args,
        retryable_exceptions: Tuple = (Exception,),
        **kwargs
    ):
        """Execute function with retry logic"""

        last_exception = None

        for attempt in range(self.max_retries + 1):
            try:
                return await func(*args, **kwargs)

            except retryable_exceptions as e:
                last_exception = e

                if attempt < self.max_retries:
                    delay = self._calculate_delay(attempt)
                    await asyncio.sleep(delay)
                else:
                    raise

        raise last_exception

    def _calculate_delay(self, attempt: int) -> float:
        """Calculate delay with exponential backoff and jitter"""

        delay = min(
            self.base_delay * (self.exponential_base ** attempt),
            self.max_delay
        )

        if self.jitter:
            delay = delay * (0.5 + random.random())

        return delay
```

### 12.3 Dead Letter Queue

```python
class DeadLetterQueueHandler:
    """Handle failed integration messages"""

    async def process_failed_message(
        self,
        message: Dict,
        error: str,
        queue_name: str
    ):
        """Move failed message to dead letter queue"""

        dlq_message = {
            "original_message": message,
            "error": error,
            "original_queue": queue_name,
            "failed_at": datetime.utcnow().isoformat(),
            "retry_count": message.get("_retry_count", 0)
        }

        await self.redis.lpush(
            f"dlq:{queue_name}",
            json.dumps(dlq_message)
        )

        # Alert if DLQ grows too large
        dlq_size = await self.redis.llen(f"dlq:{queue_name}")
        if dlq_size > 100:
            await self.alerting.send_alert(
                severity="warning",
                message=f"Dead letter queue {queue_name} has {dlq_size} messages"
            )

    async def retry_dlq_messages(
        self,
        queue_name: str,
        max_messages: int = 10
    ):
        """Retry messages from dead letter queue"""

        for _ in range(max_messages):
            message_json = await self.redis.rpop(f"dlq:{queue_name}")

            if not message_json:
                break

            message = json.loads(message_json)

            # Increment retry count
            original = message["original_message"]
            original["_retry_count"] = message["retry_count"] + 1

            # Re-queue to original queue
            await self.redis.lpush(queue_name, json.dumps(original))
```

---

## 13. Monitoring and Observability

### 13.1 Integration Metrics

```python
class IntegrationMetrics:
    """Collect and expose integration metrics"""

    def __init__(self):
        self.prometheus = PrometheusClient()

        # Define metrics
        self.request_latency = Histogram(
            "integration_request_latency_seconds",
            "Integration request latency",
            ["integration", "endpoint", "status"]
        )

        self.request_count = Counter(
            "integration_request_total",
            "Total integration requests",
            ["integration", "endpoint", "status"]
        )

        self.circuit_breaker_state = Gauge(
            "circuit_breaker_state",
            "Circuit breaker state (0=closed, 1=half-open, 2=open)",
            ["integration"]
        )

        self.sync_duration = Histogram(
            "integration_sync_duration_seconds",
            "Integration sync duration",
            ["integration", "operation"]
        )

    def record_request(
        self,
        integration: str,
        endpoint: str,
        status: str,
        latency: float
    ):
        """Record integration request metrics"""

        self.request_latency.labels(
            integration=integration,
            endpoint=endpoint,
            status=status
        ).observe(latency)

        self.request_count.labels(
            integration=integration,
            endpoint=endpoint,
            status=status
        ).inc()
```

### 13.2 Health Checks

```python
class IntegrationHealthCheck:
    """Health check for all integrations"""

    async def check_all(self) -> Dict[str, HealthStatus]:
        """Check health of all integrations"""

        checks = {
            "ruvector": self._check_ruvector(),
            "postgresql": self._check_postgresql(),
            "redis": self._check_redis(),
            "slack": self._check_slack(),
            "email": self._check_email(),
        }

        results = await asyncio.gather(*checks.values(), return_exceptions=True)

        return {
            name: result if not isinstance(result, Exception)
                  else HealthStatus(healthy=False, error=str(result))
            for name, result in zip(checks.keys(), results)
        }

    async def _check_ruvector(self) -> HealthStatus:
        """Check Ruvector service health"""

        try:
            start = time.time()
            response = await self.ruvector_client.health_check()
            latency = time.time() - start

            return HealthStatus(
                healthy=response.get("status") == "healthy",
                latency_ms=latency * 1000
            )
        except Exception as e:
            return HealthStatus(healthy=False, error=str(e))
```

### 13.3 Audit Logging

```python
class IntegrationAuditLogger:
    """Audit logging for integration activities"""

    async def log_integration_event(
        self,
        integration: str,
        event_type: str,
        user_id: Optional[str],
        organization_id: str,
        details: Dict,
        result: str = "success"
    ):
        """Log integration event for audit trail"""

        await self.db.insert("integration_audit_logs", {
            "id": str(uuid.uuid4()),
            "integration": integration,
            "event_type": event_type,
            "user_id": user_id,
            "organization_id": organization_id,
            "details": details,
            "result": result,
            "timestamp": datetime.utcnow(),
            "ip_address": get_current_ip(),
            "user_agent": get_current_user_agent()
        })
```

---

## Appendix A: API Reference Summary

### Integration Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations` | GET | List configured integrations |
| `/api/v1/integrations/{type}` | POST | Configure new integration |
| `/api/v1/integrations/{type}/sync` | POST | Trigger manual sync |
| `/api/v1/integrations/{type}/status` | GET | Get integration status |
| `/api/v1/webhooks/{type}` | POST | Webhook endpoint |
| `/api/v1/oauth/{provider}/callback` | GET | OAuth callback |

### WebSocket Channels

| Channel | Description |
|---------|-------------|
| `alignment:{org_id}` | Alignment score updates |
| `drift:{org_id}` | Mission drift alerts |
| `documents:{org_id}` | Document processing updates |
| `notifications:{user_id}` | User notifications |

---

## Appendix B: Configuration Reference

```yaml
integrations:
  claude_flow:
    enabled: true
    swarm_topology: "hierarchical"
    max_agents: 8

  ruvector:
    embedding_service_url: "${RUVECTOR_EMBEDDING_URL}"
    hypergraph_service_url: "${RUVECTOR_HYPERGRAPH_URL}"
    mincut_service_url: "${RUVECTOR_MINCUT_URL}"

  auth:
    providers:
      - google
      - microsoft
      - okta
    jwt_secret: "${JWT_SECRET}"
    jwt_expiry_seconds: 3600

  external_apis:
    market_data:
      - provider: alpha_vantage
        api_key: "${ALPHA_VANTAGE_API_KEY}"
        rate_limit: 5  # per minute

  notifications:
    email:
      provider: sendgrid
      api_key: "${SENDGRID_API_KEY}"

    slack:
      bot_token: "${SLACK_BOT_TOKEN}"
      signing_secret: "${SLACK_SIGNING_SECRET}"

    teams:
      enabled: true

  project_management:
    asana:
      enabled: true
      oauth_client_id: "${ASANA_CLIENT_ID}"

    jira:
      enabled: true
      api_token: "${JIRA_API_TOKEN}"

  document_repositories:
    google_drive:
      enabled: true
      service_account: "${GOOGLE_SERVICE_ACCOUNT_JSON}"

    sharepoint:
      enabled: true
      tenant_id: "${AZURE_TENANT_ID}"
```

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-28
**Status:** Specification Complete

---

**Related Documents:**
- `/docs/v2_PKA/specs/integrations/ruvector_integration.md`
- `/docs/v2_PKA/specs/backend/api_specification.md`
- `/docs/v2_PKA/specs/backend/document_ingestion_pipeline.md`
- `/docs/v2_PKA/specs/architecture/system_architecture.md`
