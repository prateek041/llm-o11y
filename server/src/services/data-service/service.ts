export const dataService = {
  GetEdges: (): Promise<string> => getEdges()
}

async function getEdges() {
  return "This is reference implementation of get edges function"
}

