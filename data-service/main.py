import sys
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from gremlin_python.driver import client, serializer
from fastapi.middleware.cors import CORSMiddleware

GREMLIN_SERVER_URL = "ws://localhost:8182/gremlin"
SEED_SCRIPT_PATH = "seed_data.groovy"


class GremlinClient:
    """A context manager to handle Gremlin client connections."""

    def __init__(self, url):
        self.url = url
        self.client = None

    def __enter__(self):
        try:
            self.client = client.Client(
                self.url,
                "g",
                ssl=False,
                message_serializer=serializer.GraphSONMessageSerializer(),
            )
            return self
        except Exception as e:
            print(f"Failed to connect: {e}", file=sys.stderr)
            raise HTTPException(status_code=500, detail=f"Failed to connect: {e}")

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            self.client.close()

    def run_query(self, query):
        if not self.client:
            raise ConnectionError("Client is not connected.")
        result_set = self.client.submit(query)
        return result_set.all().result()


def load_data(gremlin_client):
    """Loads data from the seed script."""
    try:
        with open(SEED_SCRIPT_PATH, "r") as file:
            gremlin_script = file.read()
        results = gremlin_client.run_query(gremlin_script)
        return {"message": "Data loaded", "response": results}
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Seed script not found at '{SEED_SCRIPT_PATH}'"
        )


def list_vertices(gremlin_client):
    """Lists all vertices and their properties."""
    query = "g.V().valueMap(true).toList()"
    vertices = gremlin_client.run_query(query)
    return {"vertices": vertices, "total": len(vertices)}


def list_edges(gremlin_client):
    """Lists all edges in a simplified, robust format."""
    query = "g.E().elementMap().toList()"
    edges = gremlin_client.run_query(query)
    return {"edges": edges, "total": len(edges)}


def show_schema(gremlin_client):
    """
    Discovers and returns the complete graph schema, including all vertex and edge properties.
    """
    # This query correctly gets all unique vertex labels.
    vertex_labels_query = "g.V().label().dedup().toList()"
    vertex_labels = gremlin_client.run_query(vertex_labels_query)
    vertices_schema = {}

    # Find ALL vertex properties.
    for label in sorted(vertex_labels):
        # This query looks at all vertices with a given label, gets all their
        # properties, extracts the key for each property, and returns the unique set.
        props_query = f"g.V().hasLabel('{label}').properties().key().dedup().toList()"
        properties = gremlin_client.run_query(props_query)
        vertices_schema[label] = sorted(properties)

    # This query correctly gets all unique edge labels.
    edge_labels_query = "g.E().label().dedup().toList()"
    edge_labels = gremlin_client.run_query(edge_labels_query)
    edges_schema = {}

    for label in sorted(edge_labels):
        # The query for finding connections.
        from_query = f"g.E().hasLabel('{label}').outV().label().dedup().toList()"
        to_query = f"g.E().hasLabel('{label}').inV().label().dedup().toList()"
        from_types = gremlin_client.run_query(from_query)
        to_types = gremlin_client.run_query(to_query)

        # Add discovery for edge properties
        # This query finds all unique property keys on the edges themselves.
        edge_props_query = f"g.E().hasLabel('{label}').properties().key().dedup().toList()"
        edge_properties = gremlin_client.run_query(edge_props_query)

        # We now build the final schema object for the edge, including the properties.
        edges_schema[label] = {
            "from": sorted(from_types),
            "to": sorted(to_types),
            "properties": sorted(edge_properties)
        }
    return {"vertices": vertices_schema, "edges": edges_schema}

def execute_raw_query(gremlin_client, query_string):
    """Executes a raw Gremlin query string and returns the results."""
    try:
        results = gremlin_client.run_query(query_string)
        return {"results": results, "total": len(results)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")


def clear_graph(gremlin_client):
    """Drops all vertices from the graph."""
    query = "g.V().drop().iterate()"
    gremlin_client.run_query(query)
    return {"message": "Graph cleared"}


# FastAPI app setup
app = FastAPI(
    title="LLM Observability Data Service",
    description="FastAPI server for JanusGraph operations.",
)

# NOTE: I know this is not safe :D
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    query: str


@app.post('/clear')
def clear_Graph():
    with GremlinClient(GREMLIN_SERVER_URL) as gremlin_client:
        return clear_graph(gremlin_client)

@app.get("/edges")
def get_edges():
    with GremlinClient(GREMLIN_SERVER_URL) as gremlin_client:
        return list_edges(gremlin_client)


@app.get("/vertices")
def get_vertices():
    with GremlinClient(GREMLIN_SERVER_URL) as gremlin_client:
        return list_vertices(gremlin_client)


@app.get("/schema")
def get_schema():
    with GremlinClient(GREMLIN_SERVER_URL) as gremlin_client:
        return show_schema(gremlin_client)


@app.post("/load")
def post_load():
    with GremlinClient(GREMLIN_SERVER_URL) as gremlin_client:
        return load_data(gremlin_client)


@app.post("/query")
def post_query(request: QueryRequest):
    with GremlinClient(GREMLIN_SERVER_URL) as gremlin_client:
        return execute_raw_query(gremlin_client, request.query)
