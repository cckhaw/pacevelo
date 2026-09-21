export type MetricType = "total_distance_km" | "active_time_mins" | "elevation_m";
export type ActivityType = "Run" | "Ride" | "Walk";
export type ProfileRole = "employee" | "admin";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          slack_webhook_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          slack_webhook_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          full_name: string;
          avatar_url: string | null;
          department: string | null;
          role: ProfileRole;
          strava_athlete_id: number | null;
          strava_access_token: string | null;
          strava_refresh_token: string | null;
          strava_token_expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          company_id?: string | null;
          full_name: string;
          avatar_url?: string | null;
          department?: string | null;
          role?: ProfileRole;
          strava_athlete_id?: number | null;
          strava_access_token?: string | null;
          strava_refresh_token?: string | null;
          strava_token_expires_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      challenges: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          metric_type: MetricType;
          allowed_activities: ActivityType[];
          target_departments: string[] | null;
          start_date: string;
          end_date: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          metric_type: MetricType;
          allowed_activities: ActivityType[];
          target_departments?: string[] | null;
          start_date: string;
          end_date: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["challenges"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "challenges_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      activities: {
        Row: {
          id: string;
          profile_id: string;
          challenge_id: string;
          strava_activity_id: number;
          type: ActivityType;
          distance_meters: number;
          moving_time_seconds: number;
          elevation_gain_meters: number;
          start_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          challenge_id: string;
          strava_activity_id: number;
          type: ActivityType;
          distance_meters: number;
          moving_time_seconds: number;
          elevation_gain_meters?: number;
          start_date: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "activities_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
