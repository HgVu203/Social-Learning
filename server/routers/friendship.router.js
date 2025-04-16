import express from "express";
import { FriendshipController } from "../controllers/friendship.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";

const router = express.Router();

router.use(protectedRouter);

router.post("/send", FriendshipController.sendFriend);
router.post("/accept", FriendshipController.acceptFriend);
router.post("/reject", FriendshipController.rejectFriend);
router.get("/", FriendshipController.getFriends);
router.get("/pending", FriendshipController.getPendingRequests);
router.delete("/:id", FriendshipController.unfriend);

export default router;
