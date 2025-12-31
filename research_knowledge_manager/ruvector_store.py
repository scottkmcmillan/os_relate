""
Integration with RuVector for storing and querying research knowledge.
"""
import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging
import hashlib

logger = logging.getLogger(__name__)

# In-memory storage for demonstration purposes
# In a real implementation, this would connect to a RuVector server
_KNOWLEDGE_BASE = {}

def _get_document_id(content: str, source: str) -> str:
    """Generate a unique ID for a document based on its content and source."""
    unique_str = f"{source}:{content[:1000]}"
    return hashlib.sha256(unique_str.encode('utf-8')).hexdigest()

def store_research(query: str, research_data: Dict[str, Any], output_dir: Path) -> None:
    """
    Store research results in the knowledge base.
    
    Args:
        query: The original research query
        research_data: Research results from Claude-Flow
        output_dir: Directory containing any output files
    """
    logger.info("Storing research in knowledge base")
    
    # Extract key information from the research data
    document = {
        "id": _get_document_id(query, "claude_flow"),
        "title": f"Research: {query}",
        "content": "\n\n".join(
            f"## {item['title']}\n{item['content']}" 
            for item in research_data.get("findings", [])
        ),
        "metadata": {
            "query": query,
            "model": research_data.get("model"),
            "timestamp": research_data.get("timestamp"),
            "source": "claude_flow",
            "output_dir": str(output_dir.absolute())
        },
        "embeddings": []  # In a real implementation, this would contain vector embeddings
    }
    
    # Store in the knowledge base
    _KNOWLEDGE_BASE[document["id"]] = document
    
    # Save to disk for persistence (in a real implementation, this would be handled by RuVector)
    knowledge_dir = output_dir / ".knowledge"
    knowledge_dir.mkdir(exist_ok=True)
    
    with open(knowledge_dir / f"{document['id']}.json", 'w', encoding='utf-8') as f:
        json.dump(document, f, indent=2)
    
    logger.info(f"Stored research with ID: {document['id']}")

def query_knowledge(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Query the knowledge base for relevant information.
    
    Args:
        query: Search query
        limit: Maximum number of results to return
        
    Returns:
        List of matching knowledge items with relevance scores
    """
    logger.debug(f"Querying knowledge base: {query}")
    
    # In a real implementation, this would use RuVector's semantic search
    # For now, we'll do a simple keyword match
    query_terms = set(query.lower().split())
    
    results = []
    for doc_id, doc in _KNOWLEDGE_BASE.items():
        # Simple keyword matching for demonstration
        content_terms = set(doc["content"].lower().split())
        matches = query_terms.intersection(content_terms)
        
        if matches:
            # Calculate a simple relevance score
            score = len(matches) / len(query_terms)
            results.append({
                "id": doc_id,
                "title": doc.get("title", "Untitled"),
                "content": doc["content"],
                "source": doc.get("metadata", {}).get("source", "unknown"),
                "relevance_score": score
            })
    
    # Sort by relevance score and limit results
    results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
    return results[:limit]

def generate_report(topic: str) -> Optional[str]:
    """
    Generate a report on a specific topic using the knowledge base.
    
    Args:
        topic: Topic to generate a report on
        
    Returns:
        Formatted markdown report, or None if no relevant information found
    """
    logger.info(f"Generating report on: {topic}")
    
    # Query the knowledge base for relevant information
    relevant_items = query_knowledge(topic, limit=10)
    
    if not relevant_items:
        return None
    
    # Generate a markdown report
    report = [
        f"# Research Report: {topic}",
        "",
        "## Summary",
        f"This report was generated based on {len(relevant_items)} relevant research items "
        "from the knowledge base.",
        ""
    ]
    
    # Add sections for each relevant item
    for i, item in enumerate(relevant_items, 1):
        report.extend([
            f"## {i}. {item['title']}",
            "",
            item['content'][:1000] + ("..." if len(item['content']) > 1000 else ""),
            "",
            f"*Source: {item['source']}*",
            ""
        ])
    
    return "\n".join(report)
