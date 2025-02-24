import express from "express";
import { GroupController } from "../controllers/group.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { groupValidationSchema } from "../utils/validator/group.validator.js";

const router = express.Router();

// Protected routes
router.use(protectedRouter);

// Group management
router.post("/", GroupController.createGroup);
router.get("/", GroupController.getGroups);
router.get("/:id", GroupController.getGroupById);
router.patch("/:id", GroupController.updateGroup);
router.delete("/:id", GroupController.deleteGroup);

// Membership management
router.post("/:id/join", GroupController.joinGroup);
router.post("/:id/leave", GroupController.leaveGroup);
router.patch("/:id/member-role", GroupController.updateMemberRole);

export default router;