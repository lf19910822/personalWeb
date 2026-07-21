import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "change_me_strong_password";

function sign(user: string): string {
  return crypto.createHmac("sha256", SECRET).update(user).digest("hex");
}

/** 生成登录 token(user 签名) */
export function makeToken(user: string): string {
  return `v1.${Buffer.from(user, "utf8").toString("base64url")}.${sign(user)}`;
}

/** 校验 token */
export function verifyToken(token?: string): boolean {
  if (!token) return false;
  const [version, encodedUser, sig] = token.split(".");
  if (version !== "v1" || !encodedUser || !sig) return false;
  let user = "";
  try {
    user = Buffer.from(encodedUser, "base64url").toString("utf8");
  } catch {
    return false;
  }
  return sign(user) === sig && user === ADMIN_USER;
}

/** 校验账号密码(生产建议换常量时间比较 + 强密码策略) */
export function checkCredentials(user: string, pass: string): boolean {
  return user === ADMIN_USER && pass === ADMIN_PASS;
}
