export interface LaunchEmail {
  id: string;
  email: string;
  source: string;
  subscribed_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLaunchEmailRequest {
  email: string;
  source?: string;
}

export interface LaunchEmailResponse {
  success: boolean;
  message: string;
  alreadySubscribed?: boolean;
  email?: LaunchEmail;
  error?: string;
}
