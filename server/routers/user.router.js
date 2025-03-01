import express from "express";
import { UserController } from "../controllers/user.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { userValidationSchema } from "../utils/validator/user.validator.js";

const router = express.Router();

router.get("/profile/:id?", UserController.getUserProfile);

router.get("/leaderboard", UserController.getLeaderboard);

router.use(protectedRouter);

router.patch(
  "/update-profile",
  validateRequest(userValidationSchema.updateProfile),
  UserController.updateProfile
);

router.post(
  "/update-points",
  validateRequest(userValidationSchema.updatePoints),
  UserController.updatePoints
);

router.get("/profile/", UserController.myProfile);

export default router;
