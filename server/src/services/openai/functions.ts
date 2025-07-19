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

export const supportedFunctions: Record<string, IFunctionType> = {
  getEdges: GetEdgesFunc,
  getSchema: GetSchemaFunc
};
