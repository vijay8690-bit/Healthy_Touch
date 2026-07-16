import TeamMember from '../models/TeamMember.js';

// @desc    Get all active team members (public)
// @route   GET /api/team
// @access  Public
export const getPublicTeamMembers = async (req, res) => {
  try {
    const members = await TeamMember.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching team members',
      error: error.message,
    });
  }
};

// @desc    Get all team members (admin)
// @route   GET /api/admin/team
// @access  Private (Admin)
export const getAllTeamMembers = async (req, res) => {
  try {
    const members = await TeamMember.find()
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching team members',
      error: error.message,
    });
  }
};

// @desc    Create team member
// @route   POST /api/admin/team
// @access  Private (Admin)
export const createTeamMember = async (req, res) => {
  try {
    const { name, role, bio, avatar, experience, profileLink, displayOrder, isActive } = req.body;

    if (!name || !role || !bio || !avatar) {
      return res.status(400).json({
        success: false,
        message: 'Name, role, bio and avatar are required',
      });
    }

    const member = await TeamMember.create({
      name,
      role,
      bio,
      avatar,
      experience: experience || '',
      profileLink: profileLink || '',
      displayOrder: Number.isFinite(Number(displayOrder)) ? Number(displayOrder) : 0,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      member,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while creating team member',
      error: error.message,
    });
  }
};

// @desc    Update team member
// @route   PUT /api/admin/team/:id
// @access  Private (Admin)
export const updateTeamMember = async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found',
      });
    }

    const allowedUpdates = [
      'name',
      'role',
      'bio',
      'avatar',
      'experience',
      'profileLink',
      'displayOrder',
      'isActive',
    ];

    allowedUpdates.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        member[key] = req.body[key];
      }
    });

    member.updatedBy = req.user?._id;
    await member.save();

    return res.status(200).json({
      success: true,
      message: 'Team member updated successfully',
      member,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while updating team member',
      error: error.message,
    });
  }
};

// @desc    Delete team member
// @route   DELETE /api/admin/team/:id
// @access  Private (Admin)
export const deleteTeamMember = async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found',
      });
    }

    await TeamMember.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Team member deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting team member',
      error: error.message,
    });
  }
};