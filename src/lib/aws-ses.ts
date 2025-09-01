import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { SendEmailCommandInput } from "@aws-sdk/client-ses";

// AWS SES Configuration
const sesClient = new SESClient({
  region: import.meta.env.VITE_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || "",
  },
});

export interface SESEmailData {
  to: string[];
  from: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
}

export interface SESEmailTemplate {
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
}

export class AWSSESService {
  private static readonly FROM_EMAIL =
    import.meta.env.VITE_SES_FROM_EMAIL || "noreply@yourdomain.com";
  private static readonly REPLY_TO_EMAIL =
    import.meta.env.VITE_SES_REPLY_TO_EMAIL || "support@yourdomain.com";

  /**
   * Send email using AWS SES
   */
  static async sendEmail(emailData: SESEmailData): Promise<boolean> {
    try {
      const params: SendEmailCommandInput = {
        Source: emailData.from,
        Destination: {
          ToAddresses: emailData.to,
        },
        Message: {
          Subject: {
            Data: emailData.subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: emailData.htmlBody,
              Charset: "UTF-8",
            },
            ...(emailData.textBody && {
              Text: {
                Data: emailData.textBody,
                Charset: "UTF-8",
              },
            }),
          },
        },
        ...(emailData.replyTo && {
          ReplyToAddresses: [emailData.replyTo],
        }),
      };

      const command = new SendEmailCommand(params);
      await sesClient.send(command);

      console.log(`Email sent successfully to: ${emailData.to.join(", ")}`);
      return true;
    } catch (error) {
      console.error("Error sending email via SES:", error);
      return false;
    }
  }

  /**
   * Send email using a template
   */
  static async sendTemplatedEmail(
    to: string[],
    template: SESEmailTemplate,
    templateData: Record<string, string>
  ): Promise<boolean> {
    try {
      // Replace template variables
      let htmlBody = template.htmlTemplate;
      let textBody = template.textTemplate;
      let subject = template.subject;

      Object.entries(templateData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        htmlBody = htmlBody.replace(regex, value);
        if (textBody) {
          textBody = textBody.replace(regex, value);
        }
        subject = subject.replace(regex, value);
      });

      return await this.sendEmail({
        to,
        from: this.FROM_EMAIL,
        subject,
        htmlBody,
        textBody,
        replyTo: this.REPLY_TO_EMAIL,
      });
    } catch (error) {
      console.error("Error sending templated email:", error);
      return false;
    }
  }

  /**
   * Verify email address in SES (for testing)
   */
  static async verifyEmailIdentity(email: string): Promise<boolean> {
    try {
      // This would typically be done through AWS Console or CLI
      // For now, we'll just log the requirement
      console.log(`Please verify ${email} in AWS SES Console`);
      console.log("Go to: https://console.aws.amazon.com/ses/");
      return true;
    } catch (error) {
      console.error("Error verifying email identity:", error);
      return false;
    }
  }

  /**
   * Get SES sending statistics
   */
  static async getSendingStatistics(): Promise<{
    sent: number;
    rejected: number;
    bounces: number;
    complaints: number;
  } | null> {
    try {
      // This would use SES getSendStatistics API
      // For now, return mock data
      return {
        sent: 0,
        rejected: 0,
        bounces: 0,
        complaints: 0,
      };
    } catch (error) {
      console.error("Error getting SES statistics:", error);
      return null;
    }
  }
}

export default AWSSESService;
