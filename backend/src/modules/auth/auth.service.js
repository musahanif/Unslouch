import { authRepository } from "./auth.repository.js";
import { comparePassword } from "../../utils/comparePassword.js";
import { generateToken } from "../../utils/generateToken.js";
import { hashPassword } from "../../utils/hashPassword.js";
import { AppError } from "../../utils/AppError.js";

const toSafeAccount = (account) => ({
  user_id: account.user_id,
  name: account.name,
  email: account.email,
  scoliosis_type: account.scoliosis_type,
  target_daily_exercise_min: account.target_daily_exercise_min,
  posture_alert_threshold_sec: account.posture_alert_threshold_sec,
  created_at: account.created_at,
  updated_at: account.updated_at,
});

const authenticateCredentials = async ({ email, password, invalidMessage }) => {
  const account = await authRepository.findUserForAuth(email);

  if (!account) {
    throw new AppError(invalidMessage, 401);
  }

  const passwordMatches = await comparePassword(password, account.password);

  if (!passwordMatches) {
    throw new AppError(invalidMessage, 401);
  }

  return {
    token: generateToken(account),
    user: toSafeAccount(account),
  };
};

export const authService = {
  async register({ name, email, password }) {
    const existingUser = await authRepository.findUserByEmail(email);

    if (existingUser) {
      throw new AppError("Email is already registered", 409, {
        email: "Use a different email address",
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await authRepository.createUser({
      name,
      email,
      password: passwordHash,
    });

    return {
      token: generateToken(user),
      user: toSafeAccount(user),
    };
  },

  login(credentials) {
    return authenticateCredentials({
      ...credentials,
      invalidMessage: "Invalid email or password",
    });
  },

  getProfile(account) {
    return toSafeAccount(account, account.role);
  },
};
