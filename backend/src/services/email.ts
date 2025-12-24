import nodemailer, { Transporter } from "nodemailer";
import { Resend } from "resend";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private resend: Resend | null = null;
  private useResend: boolean = false;

  constructor() {
    // Check if Resend API key is available (preferred for production/Railway)
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.useResend = true;
      console.log("✅ Email service is ready (using Resend)");
      console.log(`📧 Sending from: ${process.env.EMAIL_FROM || "onboarding@resend.dev"}`);
    } else {
      // Fallback to Nodemailer for local development
      const port = parseInt(process.env.EMAIL_PORT || "465");
      const isSecure = port === 465;

      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: port,
        secure: isSecure,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS?.replace(/\s/g, ''),
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
        logger: false,
        debug: false,
      });

      // Verify transporter on startup
      this.transporter.verify((error, success) => {
        if (error) {
          console.error("❌ Email service error:", error.message);
          console.error("Please check your EMAIL_USER and EMAIL_PASS in .env file");
          console.error("Email config:", {
            host: process.env.EMAIL_HOST,
            port: port,
            secure: isSecure,
            user: process.env.EMAIL_USER,
          });
        } else {
          console.log("✅ Email service is ready (using Nodemailer)");
          console.log(`📧 Using ${process.env.EMAIL_USER} on ${process.env.EMAIL_HOST}:${port}`);
        }
      });
    }
  }

  /**
   * Send email
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (this.useResend && this.resend) {
        // Use Resend for production/Railway
        const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
        const fromName = process.env.EMAIL_FROM_NAME || "Clianta";

        const { data, error } = await this.resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });

        if (error) {
          throw new Error(error.message);
        }
        console.log(`✅ Email sent successfully to ${options.to} (ID: ${data?.id})`);
      } else if (this.transporter) {
        // Use Nodemailer for local development
        const info = await this.transporter.sendMail({
          from: `"${process.env.EMAIL_FROM_NAME || "Clianta"}" <${process.env.EMAIL_USER}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
        console.log(`✅ Email sent successfully to ${options.to} (ID: ${info.messageId})`);
      } else {
        throw new Error("No email transport configured");
      }
    } catch (error: any) {
      console.error("❌ Error sending email:", error.message);
      console.error("Email details:", {
        to: options.to,
        subject: options.subject,
        useResend: this.useResend,
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    token: string
  ): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const html = this.getVerificationEmailTemplate(name, verificationUrl);

    await this.sendEmail({
      to: email,
      subject: "Verify Your Email - Clianta",
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const html = this.getPasswordResetEmailTemplate(name, resetUrl);

    await this.sendEmail({
      to: email,
      subject: "Reset Your Password - Clianta",
      html,
    });
  }

  /**
   * Send team invite email
   */
  async sendTeamInviteEmail(
    email: string,
    inviterName: string,
    workspaceName: string,
    inviteToken: string
  ): Promise<void> {
    const inviteUrl = `${process.env.FRONTEND_URL}/invite/${inviteToken}`;
    const html = this.getTeamInviteEmailTemplate(inviterName, workspaceName, inviteUrl);

    await this.sendEmail({
      to: email,
      subject: `${inviterName} invited you to join ${workspaceName} - Clianta`,
      html,
    });
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = this.getWelcomeEmailTemplate(name);

    await this.sendEmail({
      to: email,
      subject: "Welcome to Clianta!",
      html,
    });
  }

  /**
   * Send workflow automation email
   * Used by the WorkflowService to send automated emails
   */
  async sendWorkflowEmail(
    to: string,
    subject: string,
    body: string,
    entityData?: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Replace variables in subject and body
      let processedSubject = subject;
      let processedBody = body;

      if (entityData) {
        const firstName = entityData.firstName || entityData.name?.split(" ")[0] || "";
        const lastName = entityData.lastName || entityData.name?.split(" ").slice(1).join(" ") || "";
        const fullName = entityData.name || `${firstName} ${lastName}`.trim();

        const variables: Record<string, string> = {
          // Standard patterns
          "{{firstName}}": firstName,
          "{{lastName}}": lastName,
          "{{email}}": entityData.email || "",
          "{{phone}}": entityData.phone || "",
          "{{company}}": entityData.company || "",
          "{{status}}": entityData.status || "",
          "{{source}}": entityData.source || "",
          "{{name}}": fullName,
          // contact.* patterns (for legacy/alternative template formats)
          "{{contact.name}}": fullName,
          "{{contact.firstName}}": firstName,
          "{{contact.lastName}}": lastName,
          "{{contact.email}}": entityData.email || "",
          "{{contact.phone}}": entityData.phone || "",
          "{{contact.company}}": entityData.company || "",
        };

        for (const [key, value] of Object.entries(variables)) {
          processedSubject = processedSubject.replace(new RegExp(key, "g"), value);
          processedBody = processedBody.replace(new RegExp(key, "g"), value);
        }
      }

      const htmlContent = this.getWorkflowEmailTemplate(processedSubject, processedBody);

      if (this.useResend && this.resend) {
        // Use Resend for production/Railway
        const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
        const fromName = process.env.EMAIL_FROM_NAME || "Clianta";

        const { data, error } = await this.resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to,
          subject: processedSubject,
          html: htmlContent,
        });

        if (error) {
          throw new Error(error.message);
        }
        console.log(`✅ Workflow email sent to ${to} (ID: ${data?.id})`);
        return { success: true, messageId: data?.id };
      } else if (this.transporter) {
        // Use Nodemailer for local development
        const info = await this.transporter.sendMail({
          from: `"${process.env.EMAIL_FROM_NAME || "Clianta"}" <${process.env.EMAIL_USER}>`,
          to,
          subject: processedSubject,
          html: htmlContent,
        });

        console.log(`✅ Workflow email sent to ${to} (ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } else {
        throw new Error("No email transport configured");
      }
    } catch (error: any) {
      console.error(`❌ Failed to send workflow email to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Workflow email template
   */
  private getWorkflowEmailTemplate(subject: string, body: string): string {
    // Convert newlines to <br> tags for HTML
    const htmlBody = body.replace(/\n/g, "<br>");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Clianta</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <div style="color: #374151; font-size: 16px; line-height: 1.7;">
                ${htmlBody}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 0 0 16px 16px;">
              <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px;">
                This is an automated message from Clianta CRM
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Clianta. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send OTP code email
   */
  async sendOTPEmail(
    email: string,
    code: string,
    purpose: "registration" | "login" | "password-reset"
  ): Promise<void> {
    const purposeText = {
      registration: "Complete Your Registration",
      login: "Sign In to Your Account",
      "password-reset": "Reset Your Password",
    };

    const html = this.getOTPEmailTemplate(code, purpose, purposeText[purpose]);

    await this.sendEmail({
      to: email,
      subject: `${purposeText[purpose]} - Clianta`,
      html,
    });
  }

  /**
   * Verification email template
   */
  private getVerificationEmailTemplate(
    name: string,
    verificationUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Clianta</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600;">Hi ${name}!</h2>
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                Thanks for signing up for Clianta! We're excited to have you on board. To get started, please verify your email address by clicking the button below.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                If you didn't create an account with Clianta, you can safely ignore this email.
              </p>

              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" style="color: #667eea; text-decoration: none; word-break: break-all;">${verificationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                © ${new Date().getFullYear()} Clianta. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Password reset email template
   */
  private getPasswordResetEmailTemplate(
    name: string,
    resetUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Clianta</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600;">Hi ${name}!</h2>
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #ef4444; font-size: 14px; line-height: 1.6; padding: 16px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security.
              </p>

              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #667eea; text-decoration: none; word-break: break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                © ${new Date().getFullYear()} Clianta. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Welcome email template
   */
  private getWelcomeEmailTemplate(name: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Clianta</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎉 Welcome to Clianta!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600;">Hi ${name}!</h2>
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                Your email has been successfully verified! You're now ready to experience the power of Clianta - your autonomous marketing copilot.
              </p>

              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                Here's what you can do with Clianta:
              </p>

              <ul style="margin: 0 0 30px; color: #64748b; font-size: 16px; line-height: 1.8;">
                <li>Automate your marketing campaigns 24/7</li>
                <li>Optimize performance with AI-driven insights</li>
                <li>Scale your agency without scaling your team</li>
                <li>Integrate with your favorite marketing tools</li>
              </ul>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Get Started
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                If you have any questions or need help getting started, feel free to reach out to our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                © ${new Date().getFullYear()} Clianta. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Team invite email template
   */
  private getTeamInviteEmailTemplate(
    inviterName: string,
    workspaceName: string,
    inviteUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join ${workspaceName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Clianta</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 36px;">👥</span>
                </div>
                <h2 style="margin: 0 0 10px; color: #1e293b; font-size: 24px; font-weight: 600;">You're Invited!</h2>
              </div>

              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6; text-align: center;">
                <strong style="color: #1e293b;">${inviterName}</strong> has invited you to collaborate on 
                <strong style="color: #1e293b;">${workspaceName}</strong> in Clianta.
              </p>

              <p style="margin: 0 0 30px; color: #64748b; font-size: 16px; line-height: 1.6; text-align: center;">
                Join the team to start collaborating on contacts, deals, campaigns, and more.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px auto;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #f59e0b; font-size: 14px; line-height: 1.6; padding: 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; text-align: center;">
                <strong>⏰ This invitation expires in 7 days</strong>
              </p>

              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #667eea; text-decoration: none; word-break: break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #94a3b8; font-size: 14px;">
                If you don't recognize this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                © ${new Date().getFullYear()} Clianta. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * OTP email template
   */
  private getOTPEmailTemplate(
    code: string,
    purpose: string,
    title: string
  ): string {
    const descriptionText = {
      registration: "Enter this code to verify your email and complete your registration.",
      login: "Enter this code to sign in to your account.",
      "password-reset": "Enter this code to reset your password.",
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Clianta</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600; text-align: center;">${title}</h2>
              <p style="margin: 0 0 30px; color: #64748b; font-size: 16px; line-height: 1.6; text-align: center;">
                ${descriptionText[purpose as keyof typeof descriptionText]}
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" style="margin: 30px auto; width: 100%;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 2px dashed #cbd5e1; border-radius: 12px; padding: 30px; display: inline-block;">
                      <p style="margin: 0 0 10px; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                      <p style="margin: 0; font-size: 42px; font-weight: 700; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">${code}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #ef4444; font-size: 14px; line-height: 1.6; padding: 16px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; text-align: center;">
                <strong>⏰ This code expires in 10 minutes</strong>
              </p>

              <p style="margin: 30px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                © ${new Date().getFullYear()} Clianta. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

export default new EmailService();
