import UserModel from "../models/UserModel.js";
import { formatUser } from "../utils/transformers.js";
import { compressImage } from "../utils/compressImage.utils.js";
import { uploadFile } from "../utils/uploadToCloudinary.utils.js";

// GET /api/users
// -> User[]
export const getUsers = async (req, res) => {
  try {
    const users = await UserModel.find({ _id: { $ne: req.user._id } }).sort({
      name: 1,
    });

    return res.status(200).json(users.map(formatUser));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/users/:id
// -> User
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    return res.status(200).json(formatUser(user));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/users/:id
// Partial<User> -> User
// Only allows updating fields the owner of the account should control.
export const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (id !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only update your own profile",
      });
    }

    const allowedFields = ["name", "bio"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updatedUser = await UserModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    return res.status(200).json(formatUser(updatedUser));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/users/:id/avatar
// multipart file -> { avatarUrl: string }
export const updateAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (id !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only update your own avatar",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const compressedBuffer = await compressImage(req.file.buffer);
    const result = await uploadFile(compressedBuffer);

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { avatarUrl: result.secure_url },
      { new: true }
    );

    return res.status(200).json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
