import * as nodemailer from "nodemailer";
import type { Context } from "../context";
import type { Message } from "../messages";
import type { User } from "../userPoolService";
import type { MessageSender } from "./messageSender";

// Escape values before interpolating them into the HTML email template so
// that user-supplied usernames or custom message bodies cannot inject HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class SmtpMessageSender implements MessageSender {
  private readonly transporter: nodemailer.Transporter;

  constructor(host: string, port: number) {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
    });
  }

  public async sendEmail(
    ctx: Context,
    user: User,
    destination: string,
    message: Message,
  ): Promise<void> {
    const subject = message.emailSubject ?? "Cognito Verification";
    const body =
      message.emailMessage ?? `Your verification code is: ${message.__code}`;

    ctx.logger.info({ to: destination, subject }, "Sending email via SMTP");

    await this.transporter.sendMail({
      from: "cognito-local <noreply@cognito.local>",
      to: destination,
      subject,
      text: body,
      html: `<div style="font-family:system-ui;padding:20px;">
        <h2 style="color:#FF6B35;">Cognito Local</h2>
        <p>${escapeHtml(body)}</p>
        ${message.__code ? `<p style="font-size:24px;font-weight:bold;letter-spacing:4px;margin:20px 0;">${escapeHtml(message.__code)}</p>` : ""}
        <p style="color:#999;font-size:12px;">User: ${escapeHtml(user.Username)}</p>
      </div>`,
    });
  }

  public async sendSms(
    ctx: Context,
    user: User,
    destination: string,
    message: Message,
  ): Promise<void> {
    // Route SMS as email too — MailHog captures everything
    const body =
      message.smsMessage ?? `Your verification code is: ${message.__code}`;

    ctx.logger.info({ to: destination }, "Routing SMS as email via SMTP");

    await this.transporter.sendMail({
      from: "cognito-local <sms@cognito.local>",
      to: `${destination}@sms.local`,
      subject: `SMS to ${destination}`,
      text: body,
    });
  }
}
