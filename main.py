import argparse
import sys
from gremlin_python.driver import client, serializer
import json

GREMLIN_SERVER_URL = 'ws://localhost:8182/gremlin'
SEED_SCRIPT_PATH = 'seed_data.groovy'

class GremlinClient:
    """A context manager to handle Gremlin client connections."""
    def __init__(self, url):
        self.url = url
        self.client = None

    def __enter__(self):
        print(f"Connecting to Gremlin Server at {self.url}...")
        try:
            self.client = client.Client(
                self.url,
                'g',
                ssl=False,
                message_serializer=serializer.GraphSONMessageSerializer()
            )
            print("Connection successful.")
            return self
        except Exception as e:
            print(f"Failed to connect: {e}", file=sys.stderr)
            sys.exit(1)

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            self.client.close()
            print("Connection closed.")

    def run_query(self, query):
        """Submits a query and returns the results as a list."""
        if not self.client:
            raise ConnectionError("Client is not connected.")
        
        print(f"Executing query: {query}")
        result_set = self.client.submit(query)
        return result_set.all().result()

def load_data(gremlin_client):
    """Loads data from the seed script."""
    print(f"Reading Gremlin script from '{SEED_SCRIPT_PATH}'...")
    try:
        with open(SEED_SCRIPT_PATH, 'r') as file:
            gremlin_script = file.read()
        results = gremlin_client.run_query(gremlin_script)
        print("\n--- Data Loading Complete ---")
        print(f"Server response: {results}")
    except FileNotFoundError:
        print(f"Error: Seed script not found at '{SEED_SCRIPT_PATH}'", file=sys.stderr)

def list_vertices(gremlin_client):
    """Lists all vertices and their properties."""
    query = "g.V().valueMap(true).toList()"
    vertices = gremlin_client.run_query(query)
    print("\n--- Vertices ---")
    if not vertices:
        print("No vertices found.")
    for v in vertices:
        print(v)
    print(f"\nTotal: {len(vertices)} vertices found.")

def list_edges(gremlin_client):
    """Lists all edges in a simplified, robust format."""
    query = "g.E().elementMap().toList()"
    edges = gremlin_client.run_query(query)
    print("\n--- Edges ---")
    if not edges:
        print("No edges found.")
    for e in edges:
        print(e)
    print(f"\nTotal: {len(edges)} edges found.")

def show_schema(gremlin_client):
    """Discovers and prints the graph schema using robust queries."""
    print("\n--- Graph Schema Snapshot ---")
    
    vertex_labels_query = "g.V().label().dedup().toList()"
    vertex_labels = gremlin_client.run_query(vertex_labels_query)
    
    print("# Vertices (Nodes) and their properties:")
    for label in sorted(vertex_labels):
        props_query = f"g.V().hasLabel('{label}').limit(1).valueMap(true).toList()"
        
        properties_list = gremlin_client.run_query(props_query)
        
        if not properties_list:
            properties = []
        else:
            properties = properties_list[0].keys()

        filtered_props = sorted([p for p in properties if isinstance(p, str)])
        print(f"- '{label}': {filtered_props}")

    print("\n# Edges (Relationships) and their connections:")
    edge_labels_query = "g.E().label().dedup().toList()"
    edge_labels = gremlin_client.run_query(edge_labels_query)
    for label in sorted(edge_labels):
        from_query = f"g.E().hasLabel('{label}').outV().label().dedup().toList()"
        to_query = f"g.E().hasLabel('{label}').inV().label().dedup().toList()"
        
        from_types = gremlin_client.run_query(from_query)
        to_types = gremlin_client.run_query(to_query)
        print(f"- '{label}': (from: {sorted(from_types)}, to: {sorted(to_types)})")

def execute_raw_query(gremlin_client, query_string):
    """Executes a raw Gremlin query string and prints the results."""
    print(f"\nExecuting raw user-provided query...")
    try:
        results = gremlin_client.run_query(query_string)
        print("\n--- Query Result ---")
        if not results:
            print("Query returned no results or was an update command.")
        else:
            for result in results:
                if isinstance(result, (dict, list)):
                    print(json.dumps(result, indent=2, default=str)) 
                else:
                    print(result)
            print(f"\nTotal items returned: {len(results)}")
    except Exception as e:
        print("\n--- Query Failed ---", file=sys.stderr)
        print("The database server returned an error, likely due to invalid Gremlin syntax.", file=sys.stderr)
        raise e

def clear_graph(gremlin_client, confirmed=False):
    """Drops all vertices from the graph."""
    if not confirmed:
        print("This is a destructive action. It will delete all data.")
        print("Run with '--yes' to confirm.")
        return
        
    query = "g.V().drop().iterate()"
    gremlin_client.run_query(query)
    print("\n--- Graph Cleared ---")

def main():
    parser = argparse.ArgumentParser(description="A CLI to interact with the JanusGraph database.")
    subparsers = parser.add_subparsers(dest='command', required=True, help='Available commands')

    parser_load = subparsers.add_parser('load', help='Clear the graph and load data from seed_data.groovy')
    parser_vertices = subparsers.add_parser('vertices', help='List all vertices in the graph')
    parser_edges = subparsers.add_parser('edges', help='List all edges in the graph')
    parser_schema = subparsers.add_parser('schema', help='Discover and display the graph schema')
    parser_clear = subparsers.add_parser('clear', help='Clear all data from the graph')
    parser_clear.add_argument('--yes', action='store_true', help='Confirm destructive action')

    parser_query = subparsers.add_parser('query', help='Execute a raw Gremlin query string')
    parser_query.add_argument('gremlin_query', type=str, help='The Gremlin query to execute (must be in quotes)')
    
    args = parser.parse_args()

    with GremlinClient(GREMLIN_SERVER_URL) as gremlin_client:
        if args.command == 'load':
            load_data(gremlin_client)
        elif args.command == 'vertices':
            list_vertices(gremlin_client)
        elif args.command == 'edges':
            list_edges(gremlin_client)
        elif args.command == 'schema':
            show_schema(gremlin_client)
        elif args.command == 'clear':
            clear_graph(gremlin_client, args.yes)
        elif args.command == 'query':
            execute_raw_query(gremlin_client, args.gremlin_query)

if __name__ == "__main__":
    main()
