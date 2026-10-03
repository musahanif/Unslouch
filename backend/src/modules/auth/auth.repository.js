import { prisma } from "../../config/db.js";

const accountSelect = {
  user_id: true,
  name: true,
  email: true,
  scoliosis_type: true,
  target_daily_exercise_min: true,
  posture_alert_threshold_sec: true,
  created_at: true,
  updated_at: true,
};

export const authRepository = {
  findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        ...accountSelect,
        password: true,
      },
    });
  },

  findUserForAuth(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        ...accountSelect,
        password: true,
      },
    });
  },

  createUser(data) {
    return prisma.user.create({
      data,
      select: accountSelect,
    });
  },
};
