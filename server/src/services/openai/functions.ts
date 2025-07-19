import { dataService } from "../data-service/service";

export interface IFunctionType {
  name: string;
  fn: (args: any) => Promise<string>;
  functionalityType: "INFRA"
}

const getEdgesFunc = async (args: string): Promise<string> => {
  const edges = await dataService.GetEdges()
  return JSON.stringify(edges)
}

const getSchemaFunc = async (args: string): Promise<string> => {
  const schema = await dataService.GetSchema()
  return JSON.stringify(schema)
}

const runQueryFunc = async (query: string): Promise<string> => {
  const jsonQuery = JSON.parse(query)
  const queryResponse = await dataService.RunQuery(jsonQuery.query)
  return JSON.stringify(queryResponse)
}

const GetEdgesFunc: IFunctionType = {
  name: "getEdges",
  fn: getEdgesFunc,
  functionalityType: "INFRA"
}

const GetSchemaFunc: IFunctionType = {
  name: "getSchema",
  fn: getSchemaFunc,
  functionalityType: "INFRA"
}

const RunQueryFunc: IFunctionType = {
  name: "query",
  fn: runQueryFunc,
  functionalityType: "INFRA"
}

export const supportedFunctions: Record<string, IFunctionType> = {
  getEdges: GetEdgesFunc,
  getSchema: GetSchemaFunc,
  query: RunQueryFunc
};
