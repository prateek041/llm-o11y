export interface GremlinEdge {
  id: any;
  label: string;
  inV: number;
  outV: number;
  inVLabel: string;
  outVLabel: string;
  properties?: { [key: string]: any };
}

export interface GetEdgesResponse {
  edges: GremlinEdge[];
  total: number;
}

export interface SchemaVertices {
  [vertexLabel: string]: string[];
}

export interface SchemaEdges {
  [edgeLabel: string]: {
    from: string[];
    to: string[];
  };
}

export interface GetSchemaResponse {
  vertices: SchemaVertices;
  edges: SchemaEdges;
}
