import bcrypt from "bcryptjs";
import { authRepository, AuthRepository } from "./auth.repository";
import { generateToken } from "../../utils/jwt";
import { AuthenticationError, ValidationError, InternalServerError } from "../../utils/errors";
import { RegisterInput, LoginInput } from "../../utils/validation";
import { logger } from "../../utils/logger";

export class AuthService {
  constructor(private repo: AuthRepository = authRepository) {}

  async registerUser(input: RegisterInput) {
    const { name, email, password } = input;
    const existing = await this.repo.findByEmail(email);
    if (existing) {
      throw new ValidationError("User with this email already exists", {
        email: "User with this email already exists",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUserId = Date.now().toString();

    const createdUser = await this.repo.createUser({
      id: newUserId,
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken({
      userId: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
    });

    return { createdUser, token };
  }

  async loginUser(input: LoginInput, reqDetails: { ipAddress: string; userAgent: string }) {
    const { email, password } = input;
    const user = await this.repo.findByEmail(email);
    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AuthenticationError("Invalid email or password");
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const { userAgent, ipAddress } = reqDetails;
    let device = "Desktop";
    if (/mobile/i.test(userAgent)) device = "Mobile";
    else if (/tablet|ipad/i.test(userAgent)) device = "Tablet";

    let browser = "Chrome";
    if (/firefox/i.test(userAgent)) browser = "Firefox";
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari";
    else if (/edg/i.test(userAgent)) browser = "Edge";

    let os = "Mac OS X";
    if (/windows/i.test(userAgent)) os = "Windows";
    else if (/linux/i.test(userAgent)) os = "Linux";
    else if (/iphone|ipad/i.test(userAgent)) os = "iOS";
    else if (/android/i.test(userAgent)) os = "Android";

    try {
      await this.repo.createSession({
        id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        ipAddress,
        device,
        browser,
        os,
        location: ipAddress === "127.0.0.1" || ipAddress === "::1" ? "Localhost / Local Network" : "Client IP Region",
        isCurrent: true,
        lastActive: new Date(),
        createdAt: new Date(),
      });
    } catch (sessErr) {
      logger.error("Failed to record login session", sessErr as Error, { userId: user.id });
    }

    return { user, token };
  }
}

export const authService = new AuthService();
