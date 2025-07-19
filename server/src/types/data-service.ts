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
