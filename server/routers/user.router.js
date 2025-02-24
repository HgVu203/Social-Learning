import express from "express";
import { UserController } from "../controllers/user.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { userValidationSchema } from "../utils/validator/user.validator.js";

const router = express.Router();

router.use(protectedRouter);

router.patch("/profile",
    validateRequest(userValidationSchema.updateProfile),
    UserController.updateProfile
);

router.post("/update-points",
    validateRequest(userValidationSchema.updatePoints),
    UserController.updatePoints
);

router.get("/leaderboard", UserController.getLeaderboard);
router.get("/profile/:id?", UserController.getUserProfile);

export default router;