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
  // const { userId } = getAuth(req);
  // if (!userId) {
  //   const response = {
  //     success: false,
  //     error: createError(HTTP.STATUS.UNAUTHORIZED, "Unauthorized"),
  //   };
  //   res.status(HTTP.STATUS.UNAUTHORIZED).json(response);
  //   return;
  // }
  // const validatedObject = runCreateDTO.safeParse(req.body);
  // if (!validatedObject.success) {
  //   const err: AppError = {
  //     code: HTTP.STATUS.BAD_REQUEST,
  //     message: "invalid request",
  //     timestamp: new Date().toISOString(),
  //   };
  //   // FIX: This probably needs to be checked.
  //   return handler.onError(err);
  // }

  // create streamable run.
  const { threadId, content } = req.body;
  console.log("threadId", threadId)
  await openAIService.StreamComplete({ content, threadId }, handler);
};
