import express from "express";
import { MessageController } from "../controllers/message.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";

const router = express.Router();

router.use(protectedRouter);

// Message routes
router.post("/send", MessageController.sendMessage);
router.get("/", MessageController.getMessages);
router.get("/unread", MessageController.getUnreadCount);
router.patch("/:id/read", MessageController.markAsRead);
router.delete("/:id", MessageController.deleteMessage);
router.get("/conversations", MessageController.getConversations);

export default router;