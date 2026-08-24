import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { authService } from "./auth.service";
import { authRepository } from "./auth.repository";
import { encryptCookieValue } from "../../utils/jwt";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../middleware/errorHandler";
import { logger } from "../../utils/logger";
import { AuthenticationError, ValidationError, InternalServerError } from "../../utils/errors";
import { RegisterInput, LoginInput } from "../../utils/validation";
import { createNotificationLog } from "../notifications/notifications.controller";
import { encryptCurrentTokenDetails, decryptCurrentTokenDetails } from "../../utils/shareUtils";
import { emailService } from "../../services/emailService";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body as RegisterInput;
  logger.debug("Registration attempt", { email });

  const { createdUser, token } = await authService.registerUser({ name, email, password });
  res.cookie("token", encryptCookieValue(token), COOKIE_OPTIONS);
  logger.info("User registered successfully", { userId: createdUser.id, email: createdUser.email });

  res.status(201).json({
    message: "User registered successfully",
    token,
    user: {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      createdAt: createdUser.createdAt,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginInput;
  logger.debug("Login attempt", { email });

  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const ipAddress = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(",")[0].trim();
  const userAgent = req.headers["user-agent"] || "";

  const { user, token } = await authService.loginUser({ email, password }, { ipAddress, userAgent });

  res.cookie("token", encryptCookieValue(token), COOKIE_OPTIONS);
  logger.info("User logged in successfully", { userId: user.id, email: user.email, ipAddress });

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
});

export const getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const allUsers = await authRepository.findAllUsers();
    logger.debug("Fetched users list", { count: allUsers.length });
    res.json(allUsers);
  } catch (error) {
    logger.error("Failed to fetch users", error as Error);
    throw new InternalServerError("Failed to fetch registered users");
  }
});

export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AuthenticationError("Not authenticated");
  }
  logger.debug("User profile requested", { userId: req.user.userId });
  res.json({
    user: req.user,
  });
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!req.user) {
      throw new AuthenticationError("Not Authenticated");
    }
    logger.debug("Change Password Requested", { userId: req.user.userId });

    createNotificationLog({
      userId: req.user?.userId || (req.user as any)?.id,
      title: "Password Updated Successfully",
      message: "Password Updated Successfully",
      type: "general",
    });

    const user = await authRepository.findById(req.user.userId);
    if (!user) {
      throw new ValidationError("User not found");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new ValidationError("Current Password Does not Match");
    }

    if (newPassword !== confirmPassword) {
      throw new ValidationError("New Password and Confirm Password are not same");
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await authRepository.updatePassword({ id: req.user.userId }, hashedPassword);

    res.json({
      message: "Password Updated Successfully",
    });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logger.error("Failed to Update the Password", error as Error);
    throw new InternalServerError("Failed to Update the Password");
  }
});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  });
  logger.info("User logged out successfully", { userId: (req as any).user?.userId });
  res.json({ message: "Logout successful" });
});

export const generateMagicLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.json({ message: "Email is Required" });
      return;
    }
    const generateToken = encryptCurrentTokenDetails(email);
    const isMailSend = await emailService(email, generateToken);

    if (!isMailSend) {
      throw new InternalServerError("Failed to send password reset email. Please try again later.");
    }

    res.json({
      message: "Link is Sent to your email",
      data: {
        data: email,
      },
    });
  } catch (error) {
    logger.error("Failed to Generate the Magic Link", error as Error);
    throw new InternalServerError("Failed to Generate the Magic Link");
  }
});

export const resetPasswordWithToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      throw new ValidationError("Token, password, and confirmPassword are required");
    }

    if (password !== confirmPassword) {
      throw new ValidationError("Passwords do not match");
    }

    const decryptedPayload = decryptCurrentTokenDetails(token);
    if (!decryptedPayload) {
      throw new ValidationError("Invalid or tampered password reset token");
    }

    if (decryptedPayload.expiresAt < Date.now()) {
      throw new ValidationError("Password reset token has expired");
    }

    const normalizedEmail = decryptedPayload.emailId.toLowerCase().trim();
    const user = await authRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new ValidationError("User associated with this token was not found");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await authRepository.updatePassword({ email: normalizedEmail }, hashedPassword);

    await createNotificationLog({
      userId: user.id,
      title: "Password Changed Successfully 🔑",
      message: "Your password was recently reset using a magic link.",
      type: "security_access",
    });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error("Failed to reset password with token", error as Error);
    throw new InternalServerError("Failed to reset password");
  }
});
