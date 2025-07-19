import express, { type Request, type Response } from "express"
import { chatRouter } from "./routes"
const app = express()

const port = 9090


app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  console.log("Health route")
  res.send("Services running")
})

app.use("/chat", chatRouter)

app.listen(port, () => {
  console.log("Server Listening to port", port)
})

