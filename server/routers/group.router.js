import express from "express";
import { GroupController } from "../controllers/group.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { groupValidationSchema } from "../utils/validator/group.validator.js";
import { groupImageUpload } from "../middleware/upload.cloudinary.js";

const router = express.Router();

// Protected routes
router.use(protectedRouter);

// Group management - specific routes first, then parameterized routes
router.post("/create", groupImageUpload, GroupController.createGroup);
router.get("/", GroupController.getGroups);

// Parameterized routes
router.get("/:id", GroupController.getGroupById);
router.patch("/:id", groupImageUpload, GroupController.updateGroup);
router.delete("/:id", GroupController.deleteGroup);

// Membership management
router.post("/:id/join", GroupController.joinGroup);
router.post("/:id/leave", GroupController.leaveGroup);
router.patch("/:id/member-role", GroupController.updateMemberRole);
router.post("/:id/remove-member", GroupController.removeMember);

export default router;
