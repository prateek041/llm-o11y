import express, { type Request, type Response } from "express"
import { chatRouter } from "./routes"
import { dataService } from "./services/data-service/service";
const app = express()

const port = 9090

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  console.log("Health route")
  res.send("Services running")
})

app.use("/chat", chatRouter)
app.get('/edges', async (req: Request, res: Response) => {
  console.log("getting edges")
  const response = await dataService.GetEdges()
  res.send(response)
})
app.post("/query", async (req: Request, res: Response) => {
  console.log("running a query")
  const response = await dataService.RunQuery(req.body.query)
  res.send(response)
})

app.get('/schema', async (req: Request, res: Response) => {
  console.log("getting edges")
  const response = await dataService.GetSchema()
  res.send(response)
})

app.post("/load", async (req: Request, res: Response) => {
  console.log("loading temporary data")
  const response = await dataService.LoadData()
  res.send(response)
})

app.post("/clear", async (req: Request, res: Response) => {
  console.log("clearing temporary data")
  const response = await dataService.ClearGraph()
  res.send(response)
})

app.get("/vertices", async (req: Request, res: Response) => {
  console.log("getting vertices")
  const response = await dataService.GetVertices()
  res.send(response)
})

app.listen(port, () => {
  console.log("Server Listening to port", port)
})

