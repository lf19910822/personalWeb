export type IncomingMessage = { name: string; email: string; text: string };

/**
 * 留言邮件通知。配置了 RESEND_API_KEY + ADMIN_EMAIL 走 Resend,
 * 否则降级为服务器控制台打印(本地开发)。
 */
export async function notifyMessage(m: IncomingMessage): Promise<{ sent: boolean; mode: string }> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  if (!key || !to) {
    console.log(
      `\n[留言通知·邮件未配置] 来自 ${m.name} <${m.email}>\n${m.text}\n`
    );
    return { sent: false, mode: "console" };
  }
  const from = process.env.MAIL_FROM || "onerr@resend.dev";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `网站新留言 · ${m.name}`,
        text: `访客:${m.name}\n邮箱:${m.email}\n\n${m.text}`,
      }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}`);
    return { sent: true, mode: "resend" };
  } catch (e) {
    console.error("[邮件] 发送失败", e);
    return { sent: false, mode: "error" };
  }
}
