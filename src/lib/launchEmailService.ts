import { supabase } from "./supabase";
import type {
  CreateLaunchEmailRequest,
  LaunchEmailResponse,
} from "@/types/launchEmails";

export class LaunchEmailService {
  /**
   * Check if an email already exists in the launch_emails table
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("launch_emails")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned (email doesn't exist)
        throw error;
      }

      return !!data; // Return true if email exists, false otherwise
    } catch (error) {
      console.error("Error checking email existence:", error);
      throw error;
    }
  }

  /**
   * Subscribe a new email to the launch notification list
   */
  static async subscribeEmail(
    request: CreateLaunchEmailRequest
  ): Promise<LaunchEmailResponse> {
    try {
      const email = request.email.toLowerCase().trim();
      const source = request.source || "coming-soon-page";

      // Check if email already exists
      const exists = await this.checkEmailExists(email);
      if (exists) {
        return {
          success: true,
          message: "This email is already subscribed! 🎉",
        };
      }

      // Insert new email
      const { data, error } = await supabase
        .from("launch_emails")
        .insert([
          {
            email,
            source,
            subscribed_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: "Successfully subscribed! 🎉",
        email: data,
      };
    } catch (error) {
      console.error("Error subscribing email:", error);
      return {
        success: false,
        message: "Failed to subscribe. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get all launch emails (admin only)
   */
  static async getAllEmails(): Promise<LaunchEmailResponse> {
    try {
      const { data, error } = await supabase
        .from("launch_emails")
        .select("*")
        .order("subscribed_at", { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: "Emails retrieved successfully",
        email: data?.[0], // Return first email as example
      };
    } catch (error) {
      console.error("Error getting emails:", error);
      return {
        success: false,
        message: "Failed to retrieve emails",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
