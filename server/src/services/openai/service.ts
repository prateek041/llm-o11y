import { HTTP, type AppError, type IChat, type Result, type RunRequestDTO } from "@senseii/types";
import getOpenAIClient from "./client";
import { createStreamStart, type StreamHandler } from "../../utils/http";
import { infoLogger } from "../../utils/logger";
import { openAIUtils } from "../../utils/openai";
import { InfraAssistantId } from "./constants";

const client = getOpenAIClient();

interface IRunRequest {
  threadId?: string
  content: string
}

export const openAIService = {
  StreamComplete: (data: IRunRequest, handler: StreamHandler) =>
    streamComplete(data, handler),
  // SummariseThread: (
  //   threadId: string,
  //   wordLimit: number
  // ): Promise<Result<string>> =>
  //   summaryAssistant.summariseChat(client, threadId, wordLimit),
  // GetChatMessages: (chatId: string, userId: string): Promise<Result<IChat>> =>
  //   getChatMessages(chatId, userId),
};

/**
 * getChatMessages returns all the messages in the thread
 */
// const getChatMessages = async (
//   chatId: string,
//   userId: string
// ): Promise<Result<IChat>> => {
//   infoLogger({
//     message: `get message for chat: ${chatId}: user: ${userId}`,
//     layer,
//     name,
//   });
//   const response = await userProfileStore.GetChat(userId, chatId);
//   if (!response.success) {
//     return response;
//   }
//   // const { threadId } = response.data
//   // const chats = await client.beta.threads.messages.list(threadId)
//   infoLogger({
//     message: "chats found successfully",
//     status: "success",
//     layer,
//     name,
//   });
//   return {
//     success: true,
//     data: response.data,
//   };
// };

/**
 * streamComplete creates a streamable run on the backend.
 */
const streamComplete = async (
  data: IRunRequest,
  handler: StreamHandler,
  assistantId?: string
) => {
  let threadId = data.threadId
  try {
    infoLogger({
      message: "creating a streamable run",
      status: "INFO",
      layer: "SERVICE",
      name: "OPENAI",
    });
    // start stream processing
    handler.onMessage(createStreamStart())

    // gettingthe assistant id
    let assistant_id = assistantId ? assistantId : (InfraAssistantId as string);

    // check if chat exists.
    // const response = await userProfileStore.GetChat(data.userId, data.chatId);
    if (!threadId) {
      threadId = await openAIUtils.CreateEmptyThread()
    }
    // if (!response.success) {
    //   infoLogger({
    //     message: "chat does not exist",
    //     status: "failed",
    //     layer,
    //     name,
    //   });
    //   handler.onComplete();
    //   return;
    // }


    infoLogger({ message: `got a new Thread ${threadId}` })
    const threadMessages = await client.beta.threads.messages.list(threadId)

    // add the user message to the thread.
    await openAIUtils.AddMessageToThread(client, threadId, openAIUtils.CreateMessage(data.content, "user"))

    // create a stream and process it.
    let stream = client.beta.threads.runs.stream(threadId, {
      assistant_id: assistant_id,
    });
    await openAIUtils.ProcessStream(
      stream,
      client,
      threadId,
      handler
    );
    infoLogger({
      message: "creating a streamable run -> success",
      status: "success",
      layer: "SERVICE",
      name: "OPENAI",
    });
  } catch (error) {
    infoLogger({
      message: `error processing stream ${error}`,
      status: "failed",
      layer: "SERVICE",
      name: "OPENAI",
    });
    const err: AppError = {
      code: HTTP.STATUS.INTERNAL_SERVER_ERROR,
      message: "internal server error",
      timestamp: new Date().toISOString(),
    };
    return handler.onError(err);
  }
};
