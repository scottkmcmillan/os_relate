import click
from pathlib import Path
from typing import Optional
import logging
from .claude_flow import run_research
from .ruvector_store import store_research, query_knowledge, generate_report

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@click.group()
@click.option('--verbose', is_flag=True, help='Enable verbose output')
def cli(verbose: bool):
    """Research Knowledge Manager - CLI for managing research with Claude-Flow and RuVector."""
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.debug("Verbose output enabled")

@cli.command()
@click.argument('research_query', required=True)
@click.option('--output-dir', type=click.Path(file_okay=False, dir_okay=True, writable=True),
              default='./research_output', help='Directory to store research output')
@click.option('--model', default='claude-3-opus-20240229',
              help='Claude model to use for research')
def research(research_query: str, output_dir: str, model: str):
    """Run a research task using Claude-Flow."""
    try:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Starting research: {research_query}")
        research_results = run_research(research_query, output_path, model)
        
        logger.info("Storing research results in knowledge base")
        store_research(research_query, research_results, output_path)
        
        click.echo(f"Research completed successfully. Results stored in {output_path}")
    except Exception as e:
        logger.error(f"Research failed: {str(e)}", exc_info=True)
        raise click.ClickException(str(e))

@cli.command()
@click.argument('query', required=True)
@click.option('--limit', default=5, help='Maximum number of results to return')
def search(query: str, limit: int):
    """Search the knowledge base for relevant research."""
    try:
        results = query_knowledge(query, limit)
        if not results:
            click.echo("No results found.")
            return
            
        click.echo("\nSearch Results:" + "="*50)
        for i, result in enumerate(results, 1):
            click.echo(f"\n{i}. {result.get('title', 'Untitled')}")
            click.echo(f"   {result.get('content', '')[:200]}...")
            click.echo(f"   Source: {result.get('source', 'Unknown')}")
            
    except Exception as e:
        logger.error(f"Search failed: {str(e)}", exc_info=True)
        raise click.ClickException(str(e))

@cli.command()
@click.argument('topic', required=True)
@click.option('--output', type=click.Path(dir_okay=False, writable=True),
              default='./report.md', help='Output file for the report')
def report(topic: str, output: str):
    """Generate a report on a specific topic using existing knowledge."""
    try:
        report_content = generate_report(topic)
        if not report_content:
            click.echo("No relevant information found to generate a report.")
            return
            
        with open(output, 'w', encoding='utf-8') as f:
            f.write(report_content)
            
        click.echo(f"Report generated successfully at: {output}")
    except Exception as e:
        logger.error(f"Report generation failed: {str(e)}", exc_info=True)
        raise click.ClickException(str(e))

if __name__ == '__main__':
    cli()
