import Group from "../models/group.model.js";
import { groupValidationSchema } from "../utils/validator/group.validator.js";

export const GroupController = {
  createGroup: async (req, res) => {
    try {
      console.log("Creating group with body:", JSON.stringify(req.body));
      console.log(
        "Files received in controller:",
        req.files ? Object.keys(req.files) : "No files"
      );

      // Ensure req.user exists
      if (!req.user || !req.user._id) {
        console.error("No authenticated user found");
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      // Prepare validation data, ensuring proper type conversion for isPrivate
      const validationData = {
        name: req.body.name,
        description: req.body.description,
        // Convert string "true"/"false" to boolean
        isPrivate: req.body.isPrivate === "true" || req.body.isPrivate === true,
        tags: req.body.tags,
      };

      console.log("Validation data:", validationData);

      // Validate input
      try {
        const { error } = groupValidationSchema.create.validate(validationData);
        if (error) {
          console.error("Validation error:", error.details[0].message);
          return res.status(400).json({
            success: false,
            error: error.details[0].message,
          });
        }
      } catch (validationError) {
        console.error("Error during validation:", validationError);
        return res.status(400).json({
          success: false,
          error: "Invalid input data",
        });
      }

      const { name, description, isPrivate, tags } = validationData;
      const createdBy = req.user._id;

      // Process uploaded files from Cloudinary - cover image only
      let coverImage = null;
      try {
        if (
          req.files &&
          req.files.coverImage &&
          req.files.coverImage.length > 0
        ) {
          const coverImageFile = req.files.coverImage[0];
          console.log("Cover image file:", JSON.stringify(coverImageFile));

          // Cloudinary returns secure_url directly
          if (coverImageFile.secure_url) {
            coverImage = coverImageFile.secure_url;
            console.log("Using secure_url:", coverImage);
          } else if (coverImageFile.path) {
            coverImage = coverImageFile.path;
            console.log("Using path:", coverImage);
          } else {
            console.warn("No valid image URL found in file object");
          }
        } else {
          console.log("No coverImage file found in request");
        }
      } catch (fileError) {
        console.error("Error processing uploaded file:", fileError);
        // Continue without image if there's an error
      }

      // Create and save group
      try {
        const newGroup = new Group({
          name,
          description,
          createdBy,
          isPrivate: isPrivate || false, // Ensure default is false if undefined
          tags: tags
            ? Array.isArray(tags)
              ? tags.map((tag) => tag.toLowerCase().trim())
              : [tags].map((tag) => tag.toLowerCase().trim())
            : [],
          members: [
            {
              user: createdBy,
              role: "admin",
              joinedAt: new Date(),
            },
          ],
          coverImage,
        });

        console.log("Creating new group:", {
          name,
          description,
          createdBy: createdBy.toString(),
          isPrivate,
          hasCoverImage: !!coverImage,
        });

        await newGroup.save();

        // Populate user data safely
        try {
          await newGroup.populate("members.user", "username email avatar");
          await newGroup.populate("createdBy", "username email avatar");
        } catch (populateError) {
          console.error("Error populating member data:", populateError);
          // Continue even if populate fails
        }

        console.log("Group created successfully with ID:", newGroup._id);

        return res.status(201).json({
          success: true,
          message: "Group created successfully",
          data: newGroup,
        });
      } catch (saveError) {
        console.error("Error saving group to database:", saveError);
        return res.status(500).json({
          success: false,
          error: "Database error when creating group",
        });
      }
    } catch (error) {
      console.error("Create group error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create group. Please try again later.",
      });
    }
  },

  getGroups: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        query = "",
        tag,
        status = "active",
        sort = "createdAt",
        membership,
      } = req.query;

      const queryObj = { status };

      // Text search
      if (query && query.trim() !== "") {
        queryObj.$or = [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ];
      }

      // Tag filter
      if (tag) {
        queryObj.tags = tag;
      }

      // Membership filter - show only groups the user is a member of
      if (membership === "user") {
        queryObj["members.user"] = req.user._id;
      }
      // Privacy filter - don't show private groups unless the user is a member
      else if (req.user?.role !== "admin") {
        queryObj.$or = [
          { isPrivate: false },
          { "members.user": req.user?._id },
        ];
      }

      console.log("Group query:", JSON.stringify(queryObj, null, 2));
      console.log(
        "User:",
        req.user ? `${req.user._id} (${req.user.role})` : "Not authenticated"
      );

      // Determine sort order
      let sortOption = { createdAt: -1 }; // Default sort by newest
      if (sort === "memberCount") {
        sortOption = { "members.length": -1 }; // Sort by most members
      } else if (sort === "popular") {
        // Add any other popularity metrics here
        sortOption = { "members.length": -1 };
      }

      const groups = await Group.find(queryObj)
        .populate("createdBy", "username email avatar")
        .populate("members.user", "username email avatar")
        .sort(sortOption)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      console.log(`Found ${groups.length} groups matching query`);

      // Add isMember flag for the current user
      const groupsWithMembershipInfo = groups.map((group) => {
        const isMember = group.members.some(
          (member) => member.user?._id?.toString() === req.user._id.toString()
        );
        return {
          ...group.toObject(),
          isMember,
          membersCount: group.members.length,
        };
      });

      const total = await Group.countDocuments(queryObj);

      return res.status(200).json({
        success: true,
        data: groupsWithMembershipInfo,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Get groups error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch groups",
      });
    }
  },

  getGroupById: async (req, res) => {
    try {
      const group = await Group.findById(req.params.id)
        .populate("createdBy", "username email avatar")
        .populate("members.user", "username email avatar");

      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Check if current user is a member
      const isMember = group.members.some(
        (member) => member.user._id.toString() === req.user._id.toString()
      );

      // Create return object with member info
      const groupWithMemberInfo = {
        ...group.toObject(),
        isMember,
      };

      return res.status(200).json({ success: true, data: groupWithMemberInfo });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updateGroup: async (req, res) => {
    try {
      const { name, description, members } = req.body;
      const group = await Group.findById(req.params.id);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }
      if (group.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
      }

      // Process uploaded files from Cloudinary - cover image only
      if (req.files?.coverImage?.[0]) {
        const coverImageFile = req.files.coverImage[0];

        // Cloudinary returns secure_url directly
        group.coverImage = coverImageFile.secure_url;
      }

      group.name = name || group.name;
      group.description = description || group.description;
      group.members = members || group.members;

      await group.save();

      return res.status(200).json({ success: true, data: group });
    } catch (error) {
      console.error("Update group error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  deleteGroup: async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }
      if (group.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
      }
      await Group.findByIdAndDelete(req.params.id);
      return res
        .status(200)
        .json({ success: true, message: "Group deleted successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  joinGroup: async (req, res) => {
    try {
      const groupId = req.params.id;
      const userId = req.user._id;

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Check if user is already a member
      if (
        group.members.some(
          (member) => member.user.toString() === userId.toString()
        )
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Already a member" });
      }

      // Add member
      group.members.push({
        user: userId,
        role: "member",
        joinedAt: new Date(),
      });

      await group.save();
      await group.populate("members.user", "username email avatar");

      return res.status(200).json({
        success: true,
        message: "Joined group successfully",
        data: group,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  leaveGroup: async (req, res) => {
    try {
      const groupId = req.params.id;
      const userId = req.user._id;

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Check if user is the only member in the group
      const isOnlyMember = group.members.length === 1;
      const userRole = group.members.find(
        (m) => m.user.toString() === userId.toString()
      )?.role;

      // If user is only member, they can leave (and the group will be deleted)
      // If they're admin but not the only member, need to check if they're the last admin
      if (!isOnlyMember && userRole === "admin") {
        const adminCount = group.members.filter(
          (m) => m.role === "admin"
        ).length;
        if (adminCount === 1) {
          return res.status(400).json({
            success: false,
            error:
              "Cannot leave group as you are the last admin and there are other members",
          });
        }
      }

      // If user is the only member, delete the group
      if (isOnlyMember) {
        await Group.findByIdAndDelete(groupId);
        return res.status(200).json({
          success: true,
          message:
            "Left group and group was deleted as you were the last member",
        });
      }

      // Otherwise, remove the member
      group.members = group.members.filter(
        (member) => member.user.toString() !== userId.toString()
      );

      await group.save();

      return res.status(200).json({
        success: true,
        message: "Left group successfully",
        data: group,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updateMemberRole: async (req, res) => {
    try {
      const { memberId, role } = req.body;
      const groupId = req.params.id;
      const userId = req.user._id;

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Check if requester is admin
      const requesterRole = group.members.find(
        (m) => m.user.toString() === userId.toString()
      )?.role;

      if (requesterRole !== "admin") {
        return res.status(403).json({ success: false, error: "Unauthorized" });
      }

      // Update member role
      const memberIndex = group.members.findIndex(
        (m) => m.user.toString() === memberId.toString()
      );

      if (memberIndex === -1) {
        return res
          .status(404)
          .json({ success: false, error: "Member not found" });
      }

      group.members[memberIndex].role = role;
      await group.save();
      await group.populate("members.user", "username email avatar");

      return res.status(200).json({
        success: true,
        message: "Member role updated successfully",
        data: group,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  removeMember: async (req, res) => {
    try {
      const { memberId } = req.body;
      const groupId = req.params.id;
      const userId = req.user._id;

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Check if requester is admin
      const requesterRole = group.members.find(
        (m) => m.user.toString() === userId.toString()
      )?.role;

      if (requesterRole !== "admin") {
        return res.status(403).json({ success: false, error: "Unauthorized" });
      }

      // Check if the member to remove is the creator
      const isCreator = group.createdBy.toString() === memberId.toString();
      if (isCreator) {
        return res.status(400).json({
          success: false,
          error: "Cannot remove the creator of the group",
        });
      }

      // Check if the member to remove exists
      const memberExists = group.members.some(
        (m) => m.user.toString() === memberId.toString()
      );
      if (!memberExists) {
        return res
          .status(404)
          .json({ success: false, error: "Member not found" });
      }

      // Remove the member
      group.members = group.members.filter(
        (member) => member.user.toString() !== memberId.toString()
      );

      await group.save();
      await group.populate("members.user", "username email avatar");

      return res.status(200).json({
        success: true,
        message: "Member removed successfully",
        data: group,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};
