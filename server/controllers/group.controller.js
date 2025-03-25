import Group from "../models/group.model.js";
import { groupValidationSchema } from "../utils/validator/group.validator.js";

export const GroupController = {
    createGroup: async (req, res) => {
        try {
            const { error } = groupValidationSchema.create.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: error.details[0].message
                });
            }

            const { name, description, isPrivate, tags } = req.body;
            const createdBy = req.user._id;

            const newGroup = new Group({
                name,
                description,
                createdBy,
                isPrivate: isPrivate || false,
                tags: tags?.map(tag => tag.toLowerCase().trim()) || [],
                members: [{
                    user: createdBy,
                    role: 'admin',
                    joinedAt: new Date()
                }]
            });

            await newGroup.save();
            await newGroup.populate('members.user', 'username email avatar');

            return res.status(201).json({
                success: true,
                message: "Group created successfully",
                data: newGroup
            });
        } catch (error) {
            console.error('Create group error:', error);
            return res.status(500).json({
                success: false,
                error: "Failed to create group"
            });
        }
    },

    getGroups: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                query = '',
                tag,
                status = 'active',
                sort = 'createdAt',
                membership
            } = req.query;

            const queryObj = { status };

            // Text search
            if (query && query.trim() !== '') {
                queryObj.$or = [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } }
                ];
            }

            // Tag filter
            if (tag) {
                queryObj.tags = tag;
            }

            // Membership filter - show only groups the user is a member of
            if (membership === 'user') {
                queryObj['members.user'] = req.user._id;
            } 
            // Privacy filter - don't show private groups unless the user is a member
            else if (!req.user?.role === 'admin') {
                queryObj.$or = [
                    { isPrivate: false },
                    { 'members.user': req.user?._id }
                ];
            }

            // Determine sort order
            let sortOption = { createdAt: -1 }; // Default sort by newest
            if (sort === 'memberCount') {
                sortOption = { 'members.length': -1 }; // Sort by most members
            } else if (sort === 'popular') {
                // Add any other popularity metrics here
                sortOption = { 'members.length': -1 };
            }

            const groups = await Group.find(queryObj)
                .populate('createdBy', 'username email avatar')
                .populate('members.user', 'username email avatar')
                .sort(sortOption)
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit));

            // Add isMember flag for the current user
            const groupsWithMembershipInfo = groups.map(group => {
                const isMember = group.members.some(
                    member => member.user?._id?.toString() === req.user._id.toString()
                );
                return {
                    ...group.toObject(),
                    isMember,
                    membersCount: group.members.length
                };
            });

            const total = await Group.countDocuments(queryObj);

            return res.status(200).json({
                success: true,
                data: groupsWithMembershipInfo,
                pagination: {
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Get groups error:', error);
            return res.status(500).json({ 
                success: false, 
                error: error.message || "Failed to fetch groups" 
            });
        }
    },

    getGroupById: async (req, res) => {
        try {
            const group = await Group.findById(req.params.id).populate('createdBy', 'username').populate('members.user', 'username');
            if (!group) {
                return res.status(404).json({ success: false, error: "Group not found" });
            }
            return res.status(200).json({ success: true, data: group });
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
                return res.status(404).json({ success: false, error: "Group not found" });
            }
            if (group.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, error: "Unauthorized" });
            }
            group.name = name || group.name;
            group.description = description || group.description;
            group.members = members || group.members;
            await group.save();
            return res.status(200).json({ success: true, data: group });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteGroup: async (req, res) => {
        try {
            const group = await Group.findById(req.params.id);
            if (!group) {
                return res.status(404).json({ success: false, error: "Group not found" });
            }
            if (group.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, error: "Unauthorized" });
            }
            await Group.findByIdAndDelete(req.params.id);
            return res.status(200).json({ success: true, message: "Group deleted successfully" });
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
                return res.status(404).json({ success: false, error: "Group not found" });
            }

            // Check if user is already a member
            if (group.members.some(member => member.user.toString() === userId.toString())) {
                return res.status(400).json({ success: false, error: "Already a member" });
            }

            // Add member
            group.members.push({
                user: userId,
                role: 'member',
                joinedAt: new Date()
            });

            await group.save();
            await group.populate('members.user', 'username email avatar');

            return res.status(200).json({
                success: true,
                message: "Joined group successfully",
                data: group
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
                return res.status(404).json({ success: false, error: "Group not found" });
            }

            // Cannot leave if you're the last admin
            const userRole = group.members.find(m => m.user.toString() === userId.toString())?.role;
            if (userRole === 'admin') {
                const adminCount = group.members.filter(m => m.role === 'admin').length;
                if (adminCount === 1) {
                    return res.status(400).json({
                        success: false,
                        error: "Cannot leave group as you are the last admin"
                    });
                }
            }

            // Remove member
            group.members = group.members.filter(
                member => member.user.toString() !== userId.toString()
            );

            await group.save();

            return res.status(200).json({
                success: true,
                message: "Left group successfully"
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
                return res.status(404).json({ success: false, error: "Group not found" });
            }

            // Check if requester is admin
            const requesterRole = group.members.find(
                m => m.user.toString() === userId.toString()
            )?.role;

            if (requesterRole !== 'admin') {
                return res.status(403).json({ success: false, error: "Unauthorized" });
            }

            // Update member role
            const memberIndex = group.members.findIndex(
                m => m.user.toString() === memberId.toString()
            );

            if (memberIndex === -1) {
                return res.status(404).json({ success: false, error: "Member not found" });
            }

            group.members[memberIndex].role = role;
            await group.save();
            await group.populate('members.user', 'username email avatar');

            return res.status(200).json({
                success: true,
                message: "Member role updated successfully",
                data: group
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};