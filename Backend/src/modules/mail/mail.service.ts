import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';

interface PasswordResetParams {
  to: string;
  name?: string | null;
  token: string;
  resetUrl: string;
  expiresAt: Date;
}

interface VerificationEmailParams {
  to: string;
  name?: string | null;
  code: string;
  expiresAt: Date;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;
  private readonly supportEmail: string | null;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = Number(this.configService.get<string>('MAIL_PORT') ?? '587');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');
    this.fromAddress = this.configService.get<string>('MAIL_FROM') ?? 'no-reply@kryptovault.com';
    this.supportEmail = this.configService.get<string>('SUPPORT_EMAIL') ?? null;

    if (!host) {
      this.logger.warn('MAIL_HOST is not configured. Email delivery is disabled.');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendPasswordResetEmail(params: PasswordResetParams): Promise<boolean> {
    const { to, name, token, resetUrl, expiresAt } = params;
    const greetingName = name?.split(' ')[0] ?? 'there';
    const formattedExpiry = expiresAt.toUTCString();

    const subject = 'Reset your KryptoVault password';
    const textBody = this.buildTextBody({ greetingName, resetUrl, formattedExpiry });
    const htmlBody = this.buildHtmlBody({ greetingName, resetUrl, formattedExpiry });

    const result = await this.sendMail({ to, subject, text: textBody, html: htmlBody });

    if (!result) {
      this.logger.error(`Password reset email was not dispatched to ${to}. Token: ${token}`);
    } else {
      this.logger.debug(`Password reset email queued for ${to} with token ${token}`);
    }

    return result;
  }

  async sendVerificationEmail(params: VerificationEmailParams): Promise<boolean> {
    const { to, name, code, expiresAt } = params;
    const greetingName = name?.split(' ')[0] ?? 'there';
    const formattedExpiry = expiresAt.toUTCString();

    const subject = 'Verify your KryptoVault email';
    const textBody = this.buildVerificationText({ greetingName, code, formattedExpiry });
    const htmlBody = this.buildVerificationHtml({ greetingName, code, formattedExpiry });

    const result = await this.sendMail({ to, subject, text: textBody, html: htmlBody });

    if (!result) {
      this.logger.error(`Verification email was not dispatched to ${to}. Code: ${code}`);
    } else {
      this.logger.debug(`Verification email queued for ${to} with code ${code}`);
    }

    return result;
  }

  private async sendMail(options: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Mail transport is not configured. Intended email to ${options.to} with subject "${options.subject}".`);
      this.logger.debug(options.text);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Unable to send email to ${options.to}: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  private buildTextBody(context: { greetingName: string; resetUrl: string; formattedExpiry: string }): string {
    const support = this.supportEmail ?? 'support@kryptovault.com';
    return `Hi ${context.greetingName},

We received a request to reset your KryptoVault password. Use the secure link below to continue:

${context.resetUrl}

This link expires on ${context.formattedExpiry}. If you did not request this change, please ignore this email or contact us immediately at ${support}.

Stay secure,
The KryptoVault Team`;
  }

  private buildHtmlBody(context: { greetingName: string; resetUrl: string; formattedExpiry: string }): string {
    const support = this.supportEmail ?? 'support@kryptovault.com';
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>KryptoVault Password Reset</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
      .wrapper { width: 100%; padding: 32px 0; }
      .container { max-width: 560px; margin: 0 auto; background: #111827; border-radius: 12px; overflow: hidden; box-shadow: 0 15px 40px rgba(15, 23, 42, 0.45); }
      .header { background: linear-gradient(135deg, #4338ca, #7c3aed); padding: 28px 32px; }
      .header h1 { margin: 0; font-size: 20px; color: #ffffff; }
      .content { padding: 32px; line-height: 1.6; }
      .button { display: inline-block; margin: 24px 0; padding: 14px 24px; background: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; }
      .footer { padding: 24px 32px; font-size: 13px; color: #94a3b8; }
      .footer a { color: #c4b5fd; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <h1>Password Reset Instructions</h1>
        </div>
        <div class="content">
          <p>Hi ${context.greetingName},</p>
          <p>We received a request to reset your KryptoVault password. Select the button below to choose a new password.</p>
          <p style="text-align: center;">
            <a class="button" href="${context.resetUrl}" target="_blank" rel="noopener">Reset Password</a>
          </p>
          <p>If the button doesn’t work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #c4b5fd; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px;">${context.resetUrl}</p>
          <p>This link expires on <strong>${context.formattedExpiry}</strong>. If you didn’t request this change, ignore this email or contact us immediately at <a href="mailto:${support}">${support}</a>.</p>
          <p>Stay secure,<br />The KryptoVault Team</p>
        </div>
        <div class="footer">
          <p>You’re receiving this email because a password reset was requested for your KryptoVault account.</p>
          <p>&copy; ${new Date().getFullYear()} KryptoVault. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
  }

  private buildVerificationText(context: { greetingName: string; code: string; formattedExpiry: string }): string {
    const support = this.supportEmail ?? 'support@kryptovault.com';
    return `Hi ${context.greetingName},

Use verification code ${context.code} to activate your KryptoVault account. This code expires on ${context.formattedExpiry}.

If you did not create an account with KryptoVault, ignore this email or let us know at ${support}.

Welcome aboard,
The KryptoVault Team`;
  }

  private buildVerificationHtml(context: { greetingName: string; code: string; formattedExpiry: string }): string {
    const support = this.supportEmail ?? 'support@kryptovault.com';
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>KryptoVault Email Verification</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
      .wrapper { width: 100%; padding: 32px 0; }
      .container { max-width: 520px; margin: 0 auto; background: #111827; border-radius: 12px; overflow: hidden; box-shadow: 0 15px 40px rgba(15, 23, 42, 0.45); }
      .header { background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 28px 32px; }
      .header h1 { margin: 0; font-size: 20px; color: #ffffff; }
      .content { padding: 32px; line-height: 1.6; }
      .code { display: inline-block; margin: 24px 0; padding: 16px 24px; background: #1f2937; color: #c4b5fd; font-size: 28px; letter-spacing: 0.28em; border-radius: 10px; font-weight: 700; }
      .footer { padding: 24px 32px; font-size: 13px; color: #94a3b8; }
      .footer a { color: #c4b5fd; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <h1>Confirm Your Email</h1>
        </div>
        <div class="content">
          <p>Hi ${context.greetingName},</p>
          <p>Enter the six-digit code below to verify your KryptoVault account:</p>
          <p style="text-align: center;">
            <span class="code">${context.code}</span>
          </p>
          <p>This code expires on <strong>${context.formattedExpiry}</strong>. After verification you can sign in and unlock trading features.</p>
          <p>If you didn’t request this, ignore this email or contact us at <a href="mailto:${support}">${support}</a>.</p>
          <p>Welcome aboard,<br />The KryptoVault Team</p>
        </div>
        <div class="footer">
          <p>You are receiving this email because an account was created using this address.</p>
          <p>&copy; ${new Date().getFullYear()} KryptoVault. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
  }
}
