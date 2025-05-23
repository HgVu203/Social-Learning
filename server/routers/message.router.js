import express from "express";
import { MessageController } from "../controllers/message.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";

const router = express.Router();

router.use(protectedRouter);

// Message routes
router.post("/send", MessageController.sendMessage);
router.get("/", MessageController.getMessages);
router.get("/unread-count", MessageController.getUnreadCount);
router.patch("/:id/read", MessageController.markAsRead);
router.patch("/read-all", MessageController.markAllAsRead);
router.delete("/:id", MessageController.deleteMessage);
router.get("/conversations", MessageController.getConversations);

export default router;
