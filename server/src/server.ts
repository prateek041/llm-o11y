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
  console.log("response", response)
  res.send(response)
})

app.listen(port, () => {
  console.log("Server Listening to port", port)
})

