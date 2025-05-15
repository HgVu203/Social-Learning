import Group from "../models/group.model.js";
import { groupValidationSchema } from "../utils/validator/group.validator.js";
import mongoose from "mongoose";

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
        name: req.body.name || "",
        description: req.body.description || "",
        // Convert string "true"/"false" to boolean
        isPrivate: req.body.isPrivate === "true" || req.body.isPrivate === true,
        tags: req.body.tags || [],
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
          await newGroup.populate([
            { path: "members.user", select: "username email avatar" },
            { path: "createdBy", select: "username email avatar" },
          ]);
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

      // Text search - use text index for better performance if available
      if (query && query.trim() !== "") {
        // If a text index exists, use it for better performance
        if (query.length > 3) {
          queryObj.$text = { $search: query };
        } else {
          // For short queries, use regex
          queryObj.$or = [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
          ];
        }
      }

      // Tag filter
      if (tag) {
        queryObj.tags = tag;
      }

      // Membership filter - show only groups the user is a member of
      if (membership === "user" && req.user?._id) {
        queryObj["members.user"] = req.user._id;
      }
      // Privacy filter - don't show private groups unless the user is a member
      else if (req.user?.role !== "admin") {
        queryObj.$or = [
          { isPrivate: false },
          { "members.user": req.user?._id },
        ];
      }

      // Determine sort order
      let sortOption = { createdAt: -1 }; // Default sort by newest
      if (sort === "memberCount") {
        // Use aggregation for proper member count sorting
        const groups = await Group.aggregate([
          { $match: queryObj },
          {
            $addFields: {
              membersCount: {
                $cond: {
                  if: { $isArray: "$members" },
                  then: { $size: "$members" },
                  else: 0,
                },
              },
            },
          },
          { $sort: { membersCount: -1 } },
          { $skip: (parseInt(page) - 1) * parseInt(limit) },
          { $limit: parseInt(limit) },
        ]);

        // Get total count for pagination
        const total = await Group.countDocuments(queryObj);

        // Populate user data
        await Group.populate(groups, [
          { path: "createdBy", select: "username email avatar" },
          { path: "members.user", select: "username email avatar" },
        ]);

        // Add isMember flag
        const groupsWithMembershipInfo = groups.map((group) => {
          // Đảm bảo members tồn tại và là mảng
          const members = Array.isArray(group.members) ? group.members : [];
          const isMember =
            req.user?._id &&
            members.some(
              (member) =>
                member?.user?._id?.toString() === req.user._id.toString()
            );
          return {
            ...group,
            isMember,
            // Đảm bảo membersCount là số nếu không có từ aggregation
            membersCount: group.membersCount || members.length || 0,
          };
        });

        return res.status(200).json({
          success: true,
          data: groupsWithMembershipInfo,
          pagination: {
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        });
      } else if (sort === "popular") {
        // Thay vì sử dụng members.length, dùng aggregate để sắp xếp theo số lượng thành viên
        const groups = await Group.aggregate([
          { $match: queryObj },
          {
            $addFields: {
              membersCount: {
                $cond: {
                  if: { $isArray: "$members" },
                  then: { $size: "$members" },
                  else: 0,
                },
              },
            },
          },
          { $sort: { membersCount: -1 } },
          { $skip: (parseInt(page) - 1) * parseInt(limit) },
          { $limit: parseInt(limit) },
        ]);

        // Get total count for pagination
        const total = await Group.countDocuments(queryObj);

        // Populate user data
        await Group.populate(groups, [
          { path: "createdBy", select: "username email avatar" },
          { path: "members.user", select: "username email avatar" },
        ]);

        // Add isMember flag
        const groupsWithMembershipInfo = groups.map((group) => {
          // Đảm bảo members tồn tại và là mảng
          const members = Array.isArray(group.members) ? group.members : [];
          const isMember =
            req.user?._id &&
            members.some(
              (member) =>
                member?.user?._id?.toString() === req.user._id.toString()
            );
          return {
            ...group,
            isMember,
            // Đảm bảo membersCount là số nếu không có từ aggregation
            membersCount: group.membersCount || members.length || 0,
          };
        });

        return res.status(200).json({
          success: true,
          data: groupsWithMembershipInfo,
          pagination: {
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        });
      }

      // Standard query approach without aggregation
      const groups = await Group.find(queryObj)
        .populate("createdBy", "username email avatar")
        .populate({
          path: "members.user",
          select: "username email avatar",
          options: { limit: 10 },
        })
        .sort(sortOption)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      console.log(`Found ${groups.length} groups matching query`);

      // Add isMember flag for the current user
      const groupsWithMembershipInfo = groups.map((group) => {
        // Đảm bảo members tồn tại và là mảng
        const members = Array.isArray(group.members) ? group.members : [];
        const isMember =
          req.user?._id &&
          members.some(
            (member) =>
              member?.user?._id?.toString() === req.user._id.toString()
          );
        return {
          ...group.toObject(),
          isMember,
          members: members.slice(0, 10), // chỉ trả về tối đa 10 thành viên đầu tiên
          membersCount: members.length || 0,
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
      // Special case for 'create' - prevent it from being treated as an ID
      if (req.params.id === "create") {
        return res.status(400).json({
          success: false,
          error: "Invalid request - 'create' is not a valid group ID",
        });
      }

      // Validate id format to prevent server errors
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid group ID format",
        });
      }

      const group = await Group.findById(req.params.id)
        .populate("createdBy", "username email avatar")
        .populate("members.user", "username email avatar");

      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Đảm bảo members là mảng
      const members = Array.isArray(group.members) ? group.members : [];

      // Check if current user is a member
      const isMember =
        req.user?._id &&
        members.some(
          (member) => member?.user?._id?.toString() === req.user._id.toString()
        );

      // Get user's role in the group if they are a member
      let userRole = null;
      if (isMember) {
        const memberRecord = members.find(
          (member) => member?.user?._id?.toString() === req.user._id.toString()
        );
        userRole = memberRecord?.role;
      }

      // Create return object with member info
      const groupWithMemberInfo = {
        ...group.toObject(),
        isMember,
        userRole,
        membersCount: members.length || 0,
      };

      return res.status(200).json({ success: true, data: groupWithMemberInfo });
    } catch (error) {
      console.error("Get group by ID error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updateGroup: async (req, res) => {
    try {
      // Validate id format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid group ID format",
        });
      }

      console.log("Updating group:", req.params.id);
      console.log("Request body:", req.body);
      console.log(
        "Request files:",
        req.files ? JSON.stringify(Object.keys(req.files)) : "No files"
      );

      const { name, description, isPrivate, tags } = req.body;
      const group = await Group.findById(req.params.id);

      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Check if user is an admin of this group
      const userMembership = group.members.find(
        (member) => member.user.toString() === req.user._id.toString()
      );

      if (!userMembership || userMembership.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Only group administrators can update the group",
        });
      }

      // Process uploaded files from Cloudinary - cover image only
      if (req.files?.coverImage?.[0]) {
        const coverImageFile = req.files.coverImage[0];
        console.log("Processing cover image:", {
          originalname: coverImageFile.originalname,
          size: coverImageFile.size,
          mime: coverImageFile.mimetype,
          url: coverImageFile.secure_url || "No URL provided",
          path: coverImageFile.path || "No path provided",
          cloudinary_id: coverImageFile.public_id || "No public_id provided",
        });

        // Cloudinary returns secure_url directly
        if (coverImageFile.secure_url) {
          group.coverImage = coverImageFile.secure_url;
          console.log(
            "Updated group cover image to:",
            coverImageFile.secure_url
          );
        } else if (coverImageFile.path) {
          group.coverImage = coverImageFile.path;
          console.log(
            "Updated group cover image using path:",
            coverImageFile.path
          );
        } else {
          console.error("No secure_url or path found in uploaded file");
        }
      } else {
        console.log("No cover image found in request");
      }

      // Update fields that were provided
      if (name) {
        group.name = name;
        console.log("Updated group name to:", name);
      }

      if (description !== undefined) {
        group.description = description;
        console.log("Updated group description");
      }

      if (isPrivate !== undefined) {
        group.isPrivate = isPrivate === "true" || isPrivate === true;
        console.log("Updated group privacy to:", group.isPrivate);
      }

      // Update tags if provided
      if (tags) {
        try {
          // First try to parse as JSON if it's a string
          const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
          group.tags = Array.isArray(parsedTags)
            ? parsedTags.map((tag) => tag.toLowerCase().trim())
            : [parsedTags].map((tag) => tag.toLowerCase().trim());
          console.log("Updated group tags to:", group.tags);
        } catch (e) {
          // If parsing fails, handle as string or array directly
          group.tags = Array.isArray(tags)
            ? tags.map((tag) => tag.toLowerCase().trim())
            : [tags].map((tag) => tag.toLowerCase().trim());
          console.log("Updated group tags (fallback):", group.tags);
        }
      }

      // Save the updated group
      await group.save();
      console.log("Group saved successfully");

      // Populate for response
      await group.populate([
        { path: "members.user", select: "username email avatar" },
        { path: "createdBy", select: "username email avatar" },
      ]);

      return res.status(200).json({
        success: true,
        message: "Group updated successfully",
        data: group,
      });
    } catch (error) {
      console.error("Update group error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  deleteGroup: async (req, res) => {
    try {
      // Validate id format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid group ID format",
        });
      }

      const group = await Group.findById(req.params.id);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Check if user is an admin of this group
      const userMembership = group.members.find(
        (member) => member.user.toString() === req.user._id.toString()
      );

      if (!userMembership || userMembership.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Only group administrators can delete the group",
        });
      }

      await Group.findByIdAndDelete(req.params.id);
      return res
        .status(200)
        .json({ success: true, message: "Group deleted successfully" });
    } catch (error) {
      console.error("Delete group error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  joinGroup: async (req, res) => {
    try {
      // Validate id format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid group ID format",
        });
      }

      const groupId = req.params.id;
      const userId = req.user._id;

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Đảm bảo members tồn tại
      if (!Array.isArray(group.members)) {
        group.members = [];
      }

      // Check if user is already a member
      if (
        group.members.some(
          (member) => member?.user?.toString() === userId.toString()
        )
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Already a member of this group" });
      }

      // Check if group is private and needs approval
      if (group.isPrivate && group.settings?.memberApproval) {
        // Add to member request list (would need to be implemented)
        return res.status(200).json({
          success: true,
          message: "Join request submitted and pending approval",
        });
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
      console.error("Join group error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  leaveGroup: async (req, res) => {
    try {
      // Validate id format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid group ID format",
        });
      }

      const groupId = req.params.id;
      const userId = req.user._id;

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Đảm bảo members tồn tại
      if (!Array.isArray(group.members)) {
        return res
          .status(400)
          .json({ success: false, error: "Not a member of this group" });
      }

      // Check if user is even a member
      const memberIndex = group.members.findIndex(
        (member) => member?.user?.toString() === userId.toString()
      );

      if (memberIndex === -1) {
        return res
          .status(400)
          .json({ success: false, error: "Not a member of this group" });
      }

      // Get user's role
      const userRole = group.members[memberIndex].role;

      // Count members and admins
      const memberCount = group.members.length;
      const adminCount = group.members.filter(
        (m) => m?.role === "admin"
      ).length;

      // If user is the only member, delete the group
      if (memberCount === 1) {
        await Group.findByIdAndDelete(groupId);
        return res.status(200).json({
          success: true,
          message:
            "Left group and group was deleted as you were the last member",
        });
      }

      // If user is admin and the only admin, prevent leaving unless they transfer admin role
      if (userRole === "admin" && adminCount === 1 && memberCount > 1) {
        return res.status(400).json({
          success: false,
          error:
            "You are the only admin. Please make another member an admin before leaving.",
        });
      }

      // Remove the member
      group.members.splice(memberIndex, 1);
      await group.save();

      return res.status(200).json({
        success: true,
        message: "Left group successfully",
      });
    } catch (error) {
      console.error("Leave group error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updateMemberRole: async (req, res) => {
    try {
      // Validate id format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid group ID format",
        });
      }

      const { memberId, role } = req.body;

      // Validate member ID format
      if (!mongoose.Types.ObjectId.isValid(memberId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid member ID format",
        });
      }

      // Validate role
      if (!["admin", "operator", "member"].includes(role)) {
        return res.status(400).json({
          success: false,
          error: "Invalid role. Must be one of: admin, operator, member",
        });
      }

      const groupId = req.params.id;
      const userId = req.user._id;

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Đảm bảo members tồn tại
      if (!Array.isArray(group.members)) {
        return res.status(403).json({
          success: false,
          error: "Group has no members",
        });
      }

      // Check if requester is admin
      const requesterMembership = group.members.find(
        (m) => m?.user?.toString() === userId.toString()
      );

      if (!requesterMembership || requesterMembership.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Only administrators can update member roles",
        });
      }

      // Update member role
      const memberIndex = group.members.findIndex(
        (m) => m?.user?.toString() === memberId.toString()
      );

      if (memberIndex === -1) {
        return res
          .status(404)
          .json({ success: false, error: "Member not found in this group" });
      }

      // Prevent demoting last admin if there's only one
      if (
        role !== "admin" &&
        group.members[memberIndex].role === "admin" &&
        group.members.filter((m) => m?.role === "admin").length === 1
      ) {
        return res.status(400).json({
          success: false,
          error: "Cannot demote the last admin of the group",
        });
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
      console.error("Update member role error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  removeMember: async (req, res) => {
    try {
      // Validate id format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid group ID format",
        });
      }

      const { memberId } = req.body;

      // Validate member ID format
      if (!mongoose.Types.ObjectId.isValid(memberId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid member ID format",
        });
      }

      const groupId = req.params.id;
      const userId = req.user._id;

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Đảm bảo members tồn tại
      if (!Array.isArray(group.members)) {
        return res.status(403).json({
          success: false,
          error: "Group has no members",
        });
      }

      // Check if requester is admin or operator
      const requesterMembership = group.members.find(
        (m) => m?.user?.toString() === userId.toString()
      );

      if (
        !requesterMembership ||
        (requesterMembership.role !== "admin" &&
          requesterMembership.role !== "operator")
      ) {
        return res.status(403).json({
          success: false,
          error: "Only administrators and operators can remove members",
        });
      }

      // Check the member being removed
      const memberToRemove = group.members.find(
        (m) => m?.user?.toString() === memberId.toString()
      );

      if (!memberToRemove) {
        return res
          .status(404)
          .json({ success: false, error: "Member not found in this group" });
      }

      // Operators cannot remove admins
      if (
        requesterMembership.role === "operator" &&
        memberToRemove.role === "admin"
      ) {
        return res.status(403).json({
          success: false,
          error: "Operators cannot remove administrators",
        });
      }

      // Prevent removing the last admin
      if (
        memberToRemove.role === "admin" &&
        group.members.filter((m) => m?.role === "admin").length === 1
      ) {
        return res.status(400).json({
          success: false,
          error: "Cannot remove the last admin of the group",
        });
      }

      // Remove the member
      group.members = group.members.filter(
        (member) => member?.user?.toString() !== memberId.toString()
      );

      await group.save();
      await group.populate("members.user", "username email avatar");

      return res.status(200).json({
        success: true,
        message: "Member removed successfully",
        data: group,
      });
    } catch (error) {
      console.error("Remove member error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // Improved search function for groups with AI-enhanced results
  searchGroups: async (req, res) => {
    try {
      const { q = "", page = 1, limit = 10, tag } = req.query;
      const query = q.toLowerCase().trim();

      console.log(`Searching for groups with query: "${query}"`);

      if (!query || query.trim().length < 2) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            totalPages: 0,
          },
        });
      }

      // Import AI search service
      const { AISearchService } = await import(
        "../services/ai-search.service.js"
      );
      const aiSearchService = new AISearchService();

      // Build search query
      const searchQuery = { status: "active" };

      // Privacy filter - non-admin users can only see public groups or groups they're a member of
      if (req.user?.role !== "admin") {
        searchQuery.$or = [
          { isPrivate: false },
          { "members.user": req.user?._id },
        ];
      }

      // Text search criteria with more extensive matching
      const searchTerms = query.split(/\s+/).filter((term) => term.length >= 2);

      // If multiple words, try to match the full phrase and individual terms
      if (searchTerms.length > 1) {
        searchQuery.$or = [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { tags: { $in: searchTerms.map((term) => new RegExp(term, "i")) } },
        ];

        // Add individual term matching for each significant term
        searchTerms.forEach((term) => {
          if (term.length >= 3) {
            searchQuery.$or.push(
              { name: { $regex: term, $options: "i" } },
              { description: { $regex: term, $options: "i" } }
            );
          }
        });
      } else {
        // Single term search
        searchQuery.$or = [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { tags: { $regex: query, $options: "i" } },
        ];
      }

      // Tag filter if specified
      if (tag) {
        searchQuery.tags = { $in: Array.isArray(tag) ? tag : [tag] };
      }

      // Log the query for debugging
      console.log("MongoDB search query:", JSON.stringify(searchQuery));

      // Fetch groups matching the query
      const groups = await Group.find(searchQuery)
        .populate("createdBy", "username email avatar")
        .populate("members.user", "username email avatar")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      console.log(
        `Found ${groups.length} groups matching search query "${query}"`
      );

      // Process groups to add membership info and count
      let processedGroups = groups.map((group) => {
        const members = Array.isArray(group.members) ? group.members : [];
        const isMember =
          req.user?._id &&
          members.some(
            (member) =>
              member?.user?._id?.toString() === req.user._id.toString()
          );

        return {
          ...group.toObject(),
          type: "group", // Add type for consistent frontend handling
          isMember,
          membersCount: members.length || 0,
        };
      });

      // Use AI to enhance search results if there are results
      if (processedGroups.length > 0) {
        processedGroups = await aiSearchService.enhanceSearchResults(
          query,
          processedGroups
        );
      }

      // If no exact matches, find similar groups
      let similarGroups = [];
      if (processedGroups.length === 0) {
        // Try finding groups with partial matches on keywords
        const keywords = query.split(/\s+/).filter((word) => word.length >= 3);

        if (keywords.length > 0) {
          const fuzzyConditions = [];

          // Build fuzzy conditions for each keyword
          keywords.forEach((keyword) => {
            fuzzyConditions.push(
              { name: { $regex: keyword, $options: "i" } },
              { description: { $regex: keyword, $options: "i" } },
              { tags: { $regex: keyword, $options: "i" } }
            );
          });

          // Privacy filter
          const similarQuery = {
            status: "active",
            $or: fuzzyConditions,
          };

          if (req.user?.role !== "admin") {
            similarQuery.$and = [
              {
                $or: [{ isPrivate: false }, { "members.user": req.user?._id }],
              },
            ];
          }

          // Log similar search query
          console.log(
            "Similar groups search query:",
            JSON.stringify(similarQuery)
          );

          // Find similar groups
          const similarGroupsResult = await Group.find(similarQuery)
            .populate("createdBy", "username email avatar")
            .populate("members.user", "username email avatar")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

          console.log(`Found ${similarGroupsResult.length} similar groups`);

          // Process similar groups to add metadata
          similarGroups = similarGroupsResult.map((group) => {
            const members = Array.isArray(group.members) ? group.members : [];
            const isMember =
              req.user?._id &&
              members.some(
                (member) =>
                  member?.user?._id?.toString() === req.user._id.toString()
              );

            return {
              ...group.toObject(),
              type: "group",
              isMember,
              membersCount: members.length || 0,
              isSimilarMatch: true,
            };
          });
        }
      }

      const total = await Group.countDocuments(searchQuery);

      return res.status(200).json({
        success: true,
        data: [...processedGroups, ...similarGroups],
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Search groups error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to search groups",
      });
    }
  },
};
