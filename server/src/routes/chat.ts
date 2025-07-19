import express, { Router } from "express";
import { openAIController } from "../controller/chat";

const router: Router = express.Router()

router.route("/").post(openAIController.Chat)

export default router
