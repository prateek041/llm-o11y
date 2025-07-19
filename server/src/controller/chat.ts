import { type Request, type Response } from "express";
import { createSSEHandler, setSSEHeaders } from "../utils/http";
import { infoLogger } from "../utils/logger";
import z from "zod/v3";
import { openAIService } from "../services/openai/service";

export const openAIController = {
  Chat: (req: Request, res: Response): Promise<void> => chat(req, res)
}

const layer = "CONTROLLER"
const name = "[OPENAI]"

const runCreateDTO = z.object({
  content: z.string(),
  chatId: z.string(),
});



const chat = async (req: Request, res: Response) => {
  infoLogger({
    message: "streamable chat triggered",
    status: "INFO",
    layer,
    name,
  });
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  // set headers
  setSSEHeaders(res);
  // create stream handlers.
  const handler = createSSEHandler(res, requestId);
  // create streamable run.
  const { threadId, content } = req.body;
  await openAIService.StreamComplete({ content, threadId }, handler);
};
