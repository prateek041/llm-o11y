import { dataService } from "../data-service/service";

export interface IFunctionType {
  name: string;
  fn: (args: any) => Promise<string>;
  functionalityType: "INFRA"
}

const getEdgesFunc = async (args: string): Promise<string> => {
  const edges = await dataService.GetEdges()
  return edges
}

const GetEdgesFunc: IFunctionType = {
  name: "getEdges",
  fn: getEdgesFunc,
  functionalityType: "INFRA"
}

export const supportedFunctions: Record<string, IFunctionType> = {
  getEdges: GetEdgesFunc
};
