import type { ProfileStatus, UserRole } from './roles';

export type Profile = {
  user_id: string;
  employee_code: string | null;
  full_name: string;
  position: string | null;
  department: string | null;
  work_group: string | null;
  gender: 'male' | 'female' | null;
  education: 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก' | null;
  birth_date: string | null;
  start_work_date: string | null;
  generation: 'Gen B' | 'Gen X' | 'Gen Y' | 'Gen Z' | null;
  employment_type: 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)' | null;
  role: UserRole;
  status: ProfileStatus;
  avatar_url: string | null;
  force_password_change: boolean;
  force_password_change_requested_at: string | null;
  force_password_change_requested_by: string | null;
  password_changed_at: string | null;
  mfa_required?: boolean;
  mfa_required_at?: string | null;
  mfa_required_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type Department = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type CourseCategory = {
  id: string;
  category: string;
  subcategory: string | null;
  active: boolean;
  created_at: string;
};

export type TrainingRecord = {
  id: string;
  user_id: string;
  course: string;
  category: string;
  subcategory: string | null;
  organizer: string;
  date: string;
  month: number;
  year: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Certificate = {
  id: string;
  training_id: string;
  certificate_name: string | null;
  certificate_link: string | null;
  file_path: string | null;
  created_at: string;
};

export type DevelopmentAnalysis = {
  id: string;
  training_id: string;
  user_id: string;
  development_area: string | null;
  skill_group: string | null;
  target_direction: string | null;
  created_at: string;
};

export type LoginHistory = {
  id: string;
  user_id: string | null;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
};

export type SecurityAlert = {
  id: string;
  alert_type: 'repeated_ip_failures' | 'repeated_account_failures' | 'credential_stuffing' | 'success_after_failures' | 'repeated_password_reset';
  severity: 'warning' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  fingerprint: string;
  title: string;
  description: string;
  source_ip: string | null;
  target_email: string | null;
  attempt_count: number;
  window_started_at: string;
  last_detected_at: string;
  metadata: Record<string, unknown>;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LoginIpBlockSettings = {
  singleton_id: number;
  enabled: boolean;
  attempt_limit: number;
  window_minutes: number;
  permanent_block: boolean;
  auto_unblock_days: number;
  updated_by: string | null;
  updated_at: string;
};

export type LoginIpRule = {
  id: string;
  ip_address: string;
  rule_type: 'allow' | 'block';
  source: 'automatic' | 'manual';
  is_active: boolean;
  reason: string;
  failed_attempt_count: number;
  blocked_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  module: string | null;
  action: string;
  route: string | null;
  resource_type: string;
  resource_id: string | null;
  target_type: string | null;
  target_id: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  session_id: string | null;
  exported_at: string | null;
  export_status: string;
  export_batch_id: string | null;
  retry_count: number;
  last_export_error: string | null;
  created_at: string;
};

export type SystemSetting = {
  setting_key: string;
  setting_value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteContentStatus = 'published' | 'draft' | 'scheduled';

export type SiteContentDocument = {
  id: string;
  content_key: string;
  title: string;
  content: Record<string, unknown>;
  status: SiteContentStatus;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteContentHistory = {
  id: string;
  document_id: string | null;
  content_key: string;
  content: Record<string, unknown>;
  status: SiteContentStatus;
  action: string;
  actor_id: string | null;
  created_at: string;
};


export type PortalUserManual = {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string;
  pdf_path: string | null;
  is_active: boolean;
  sort_order: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RopaLink = {
  id: string;
  title: string;
  description: string | null;
  link_url: string;
  icon_url: string | null;
  icon_path: string | null;
  preview_url: string | null;
  preview_path: string | null;
  is_active: boolean;
  sort_order: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StrategyEventStatus = 'draft' | 'published' | 'cancelled';

export type StrategyEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  end_date: string | null;
  color: string | null;
  location: string | null;
  owner_work_group: string | null;
  status: StrategyEventStatus;
  created_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingRoomReservation = {
  id: string;
  legacy_id: string | null;
  reservation_date: string;
  room: string;
  meeting_type: string;
  online_meeting_url: string | null;
  details: string | null;
  start_time: string;
  end_time: string;
  booker_name: string;
  work_group: string;
  topic: string;
  created_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ItAsset = {
  id: string;
  source_row_number: number | null;
  asset_code: string;
  computer_name: string | null;
  machine_brand_model: string | null;
  asset_type: string | null;
  operating_system: string | null;
  office_software: string | null;
  cpu: string | null;
  mainboard: string | null;
  memory_gb: number | null;
  graphics: string | null;
  video_memory: string | null;
  disk1_type: string | null;
  disk1_product: string | null;
  disk1_drive_letters: string | null;
  disk1_hours: number | null;
  disk2_type: string | null;
  disk2_product: string | null;
  disk2_drive_letters: string | null;
  disk2_hours: number | null;
  total_disk_hours: number | null;
  monitor1_brand: string | null;
  monitor1_manufacture_date: string | null;
  monitor2_brand: string | null;
  monitor2_serial_number: string | null;
  monitor2_manufacture_date: string | null;
  user_name: string | null;
  user_position: string | null;
  work_group: string | null;
  received_date: string | null;
  received_date_raw: string | null;
  ups_asset_code: string | null;
  ups_received_date: string | null;
  ups_received_date_raw: string | null;
  source_asset_code: string | null;
  created_at: string;
  updated_at: string;
};

export type ItAssetEvaluationSettings = {
  id: string;
  criteria: Record<string, unknown>;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SpdServiceTicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED' | 'CANCELLED';
export type SpdServiceUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SpdServiceCategory = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SpdServiceRequestSubject = {
  id: string;
  category_id: string;
  subject: string;
  is_active: boolean;
  requires_booking_date: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SpdServiceTicket = {
  id: string;
  ticket_no: string;
  requester_id: string;
  requester_name: string;
  requester_department: string | null;
  requester_phone: string;
  category_id: string | null;
  category_name: string;
  urgency: SpdServiceUrgency;
  status: SpdServiceTicketStatus;
  subject: string;
  description: string;
  requested_service_date: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  problem_cause: string | null;
  resolution_method: string | null;
  resolution_result: string | null;
  resolution_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type SpdServiceTicketTimeline = {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  action: string;
  from_status: SpdServiceTicketStatus | null;
  to_status: SpdServiceTicketStatus | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type SpdServiceSatisfactionSurvey = {
  id: string;
  ticket_id: string;
  requester_id: string;
  speed_rating: number;
  quality_rating: number;
  courtesy_rating: number;
  overall_rating: number;
  comment: string | null;
  created_at: string;
};

export type SpdServiceNotificationSettings = {
  id: string;
  setting_key: string;
  setting_value: string | null;
  is_secret: boolean;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SmartDspSurveyStatus = 'draft' | 'active' | 'closed' | 'archived';
export type SmartDspSurveyQuestionType = 'rating_5' | 'open_text';
export type SmartDspSurveyRespondentRole = 'executive' | 'general_user' | 'data_editor' | 'reviewer' | 'system_admin' | 'other';
export type SmartDspSurveyUsageFrequency = 'daily' | 'several_weekly' | 'weekly' | 'several_monthly' | 'rarely';

export type SmartDspSurvey = {
  id: string;
  code: string;
  version: number;
  title: string;
  description: string;
  instructions: string;
  status: SmartDspSurveyStatus;
  is_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SmartDspSurveyQuestion = {
  id: string;
  survey_id: string;
  position: number;
  question_type: SmartDspSurveyQuestionType;
  prompt: string;
  dimension: string | null;
  help_text: string | null;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SmartDspSurveyRatingOption = {
  id: string;
  survey_id: string;
  rating_value: number;
  label: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type SmartDspSurveyResponse = {
  id: string;
  survey_id: string;
  respondent_id: string;
  submitted_at: string;
  created_at: string;
};

export type SmartDspSurveyAnswer = {
  id: string;
  response_id: string;
  question_id: string;
  question_position: number;
  question_type: SmartDspSurveyQuestionType;
  question_prompt: string;
  dimension: string | null;
  rating_value: number | null;
  text_value: string | null;
  created_at: string;
};

export type SmartDspSurveyRespondentContext = {
  response_id: string;
  respondent_role: string;
  respondent_role_other: string | null;
  usage_frequency: string;
  used_services: string[];
  used_services_other: string | null;
  custom_answers: Record<string, SmartDspSurveyCustomContextAnswer>;
  created_at: string;
};

export type SmartDspSurveyCustomContextAnswer = string[] | number | string;

export type SmartDspSurveyContextOption = {
  value: string;
  label: string;
};

export type SmartDspSurveyAdditionalContextField = {
  id: string;
  prompt: string;
  selection_type: 'single' | 'multiple' | 'rating_5' | 'open_text';
  is_required: boolean;
  is_active: boolean;
  options: SmartDspSurveyContextOption[];
};

export type SmartDspSurveyContextSettings = {
  survey_id: string;
  role_prompt: string;
  frequency_prompt: string;
  services_prompt: string;
  role_options: SmartDspSurveyContextOption[];
  frequency_options: SmartDspSurveyContextOption[];
  service_options: SmartDspSurveyContextOption[];
  additional_fields: SmartDspSurveyAdditionalContextField[];
  created_at: string;
  updated_at: string;
};

export type SmartDspSurveyConsent = {
  id: string;
  response_id: string | null;
  survey_id: string;
  respondent_id: string;
  notice_version: string;
  description_snapshot: string;
  instructions_snapshot: string;
  acknowledgement_statement: string;
  consent_statement: string;
  acknowledged: boolean;
  consented: boolean;
  accepted_at: string;
  notice_sha256: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          user_id: string;
          employee_code?: string | null;
          full_name: string;
          position?: string | null;
          department?: string | null;
          work_group?: string | null;
          gender?: 'male' | 'female' | null;
          education?: 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก' | null;
          birth_date?: string | null;
          start_work_date?: string | null;
          generation?: 'Gen B' | 'Gen X' | 'Gen Y' | 'Gen Z' | null;
          employment_type?: 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)' | null;
          role?: UserRole;
          status?: ProfileStatus;
          avatar_url?: string | null;
          force_password_change?: boolean;
          force_password_change_requested_at?: string | null;
           force_password_change_requested_by?: string | null;
           password_changed_at?: string | null;
          mfa_required?: boolean;
          mfa_required_at?: string | null;
          mfa_required_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'user_id' | 'created_at'>>;
        Relationships: [];
      };
      departments: {
        Row: Department;
        Insert: {
          id?: string;
          name: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Omit<Department, 'id' | 'created_at'>>;
        Relationships: [];
      };
      course_categories: {
        Row: CourseCategory;
        Insert: {
          id?: string;
          category: string;
          subcategory?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Omit<CourseCategory, 'id' | 'created_at'>>;
        Relationships: [];
      };
      training_records: {
        Row: TrainingRecord;
        Insert: {
          id?: string;
          user_id: string;
          course: string;
          category: string;
          subcategory?: string | null;
          organizer: string;
          date: string;
          month: number;
          year: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TrainingRecord, 'id' | 'created_at'>>;
        Relationships: [];
      };
      certificates: {
        Row: Certificate;
        Insert: {
          id?: string;
          training_id: string;
          certificate_name?: string | null;
          certificate_link?: string | null;
          file_path?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Certificate, 'id' | 'training_id' | 'created_at'>>;
        Relationships: [];
      };
      development_analysis: {
        Row: DevelopmentAnalysis;
        Insert: {
          id?: string;
          training_id: string;
          user_id: string;
          development_area?: string | null;
          skill_group?: string | null;
          target_direction?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<DevelopmentAnalysis, 'id' | 'training_id' | 'created_at'>>;
        Relationships: [];
      };
      login_history: {
        Row: LoginHistory;
        Insert: {
          id?: string;
          user_id?: string | null;
          login_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          success?: boolean;
        };
        Update: Partial<Omit<LoginHistory, 'id'>>;
        Relationships: [];
      };
      security_alerts: {
        Row: SecurityAlert;
        Insert: {
          id?: string;
          alert_type: SecurityAlert['alert_type'];
          severity: SecurityAlert['severity'];
          status?: SecurityAlert['status'];
          fingerprint: string;
          title: string;
          description: string;
          source_ip?: string | null;
          target_email?: string | null;
          attempt_count?: number;
          window_started_at: string;
          last_detected_at: string;
          metadata?: Record<string, unknown>;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SecurityAlert, 'id' | 'created_at'>>;
        Relationships: [];
      };
      login_ip_block_settings: {
        Row: LoginIpBlockSettings;
        Insert: {
          singleton_id?: number;
          enabled?: boolean;
          attempt_limit?: number;
          window_minutes?: number;
          permanent_block?: boolean;
          auto_unblock_days?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Omit<LoginIpBlockSettings, 'singleton_id'>>;
        Relationships: [];
      };
      login_ip_rules: {
        Row: LoginIpRule;
        Insert: {
          id?: string;
          ip_address: string;
          rule_type: LoginIpRule['rule_type'];
          source?: LoginIpRule['source'];
          is_active?: boolean;
          reason?: string;
          failed_attempt_count?: number;
          blocked_at?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<LoginIpRule, 'id' | 'created_at'>>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_user_id?: string | null;
          actor_email?: string | null;
          actor_name?: string | null;
          actor_role?: string | null;
          module?: string | null;
          action: string;
          route?: string | null;
          resource_type: string;
          resource_id?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          status?: string;
          error_message?: string | null;
          metadata?: Record<string, unknown> | null;
          before_data?: Record<string, unknown> | null;
          after_data?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          request_id?: string | null;
          session_id?: string | null;
          exported_at?: string | null;
          export_status?: string;
          export_batch_id?: string | null;
          retry_count?: number;
          last_export_error?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<AuditLog, 'id'>>;
        Relationships: [];
      };
      system_settings: {
        Row: SystemSetting;
        Insert: {
          setting_key: string;
          setting_value?: Record<string, unknown>;
          description?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SystemSetting, 'setting_key' | 'created_at'>>;
        Relationships: [];
      };
      site_content_documents: {
        Row: SiteContentDocument;
        Insert: {
          id?: string;
          content_key: string;
          title?: string;
          content?: Record<string, unknown>;
          status?: SiteContentStatus;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SiteContentDocument, 'id' | 'created_at'>>;
        Relationships: [];
      };
      site_content_history: {
        Row: SiteContentHistory;
        Insert: {
          id?: string;
          document_id?: string | null;
          content_key: string;
          content?: Record<string, unknown>;
          status: SiteContentStatus;
          action: string;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<SiteContentHistory, 'id' | 'created_at'>>;
        Relationships: [];
      };
      portal_user_manuals: {
        Row: PortalUserManual;
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          pdf_url: string;
          pdf_path?: string | null;
          is_active?: boolean;
          sort_order?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PortalUserManual, 'id' | 'created_at'>>;
        Relationships: [];
      };
      ropa_links: {
        Row: RopaLink;
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          link_url: string;
          icon_url?: string | null;
          icon_path?: string | null;
          preview_url?: string | null;
          preview_path?: string | null;
          is_active?: boolean;
          sort_order?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<RopaLink, 'id' | 'created_at'>>;
        Relationships: [];
      };
      smartdsp_surveys: {
        Row: SmartDspSurvey;
        Insert: {
          id?: string;
          code: string;
          version?: number;
          title: string;
          description?: string;
          instructions?: string;
          status?: SmartDspSurveyStatus;
          is_enabled?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SmartDspSurvey, 'id' | 'code' | 'version' | 'created_at'>>;
        Relationships: [];
      };
      smartdsp_survey_questions: {
        Row: SmartDspSurveyQuestion;
        Insert: {
          id?: string;
          survey_id: string;
          position: number;
          question_type: SmartDspSurveyQuestionType;
          prompt: string;
          dimension?: string | null;
          help_text?: string | null;
          is_required?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SmartDspSurveyQuestion, 'id' | 'survey_id' | 'created_at'>>;
        Relationships: [];
      };
      smartdsp_survey_rating_options: {
        Row: SmartDspSurveyRatingOption;
        Insert: {
          id?: string;
          survey_id: string;
          rating_value: number;
          label: string;
          description: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SmartDspSurveyRatingOption, 'id' | 'survey_id' | 'rating_value' | 'created_at'>>;
        Relationships: [];
      };
      smartdsp_survey_responses: {
        Row: SmartDspSurveyResponse;
        Insert: {
          id?: string;
          survey_id: string;
          respondent_id: string;
          submitted_at?: string;
          created_at?: string;
        };
        Update: Partial<Omit<SmartDspSurveyResponse, 'id' | 'survey_id' | 'respondent_id' | 'created_at'>>;
        Relationships: [];
      };
      smartdsp_survey_answers: {
        Row: SmartDspSurveyAnswer;
        Insert: {
          id?: string;
          response_id: string;
          question_id: string;
          question_position: number;
          question_type: SmartDspSurveyQuestionType;
          question_prompt: string;
          dimension?: string | null;
          rating_value?: number | null;
          text_value?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<SmartDspSurveyAnswer, 'id' | 'response_id' | 'question_id' | 'created_at'>>;
        Relationships: [];
      };
      smartdsp_survey_respondent_contexts: {
        Row: SmartDspSurveyRespondentContext;
        Insert: {
          response_id: string;
          respondent_role: string;
          respondent_role_other?: string | null;
          usage_frequency: string;
          used_services: string[];
          used_services_other?: string | null;
          custom_answers?: Record<string, SmartDspSurveyCustomContextAnswer>;
          created_at?: string;
        };
        Update: Partial<Omit<SmartDspSurveyRespondentContext, 'response_id' | 'created_at'>>;
        Relationships: [];
      };
      smartdsp_survey_context_settings: {
        Row: SmartDspSurveyContextSettings;
        Insert: {
          survey_id: string;
          role_prompt: string;
          frequency_prompt: string;
          services_prompt: string;
          role_options: SmartDspSurveyContextOption[];
          frequency_options: SmartDspSurveyContextOption[];
          service_options: SmartDspSurveyContextOption[];
          additional_fields: SmartDspSurveyAdditionalContextField[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SmartDspSurveyContextSettings, 'survey_id' | 'created_at'>>;
        Relationships: [];
      };
      smartdsp_survey_consents: {
        Row: SmartDspSurveyConsent;
        Insert: {
          id?: string;
          response_id?: string | null;
          survey_id: string;
          respondent_id: string;
          notice_version: string;
          description_snapshot: string;
          instructions_snapshot: string;
          acknowledgement_statement: string;
          consent_statement: string;
          acknowledged?: boolean;
          consented?: boolean;
          accepted_at?: string;
          notice_sha256: string;
        };
        Update: never;
        Relationships: [];
      };
      strategy_events: {
        Row: StrategyEvent;
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          event_date: string;
          start_time?: string | null;
          end_time?: string | null;
          end_date?: string | null;
          color?: string | null;
          location?: string | null;
          owner_work_group?: string | null;
          status?: StrategyEventStatus;
          created_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<StrategyEvent, 'id' | 'created_at'>>;
        Relationships: [];
      };
      meeting_room_reservations: {
        Row: MeetingRoomReservation;
        Insert: {
          id?: string;
          legacy_id?: string | null;
          reservation_date: string;
          room: string;
          meeting_type?: string;
          online_meeting_url?: string | null;
          details?: string | null;
          start_time: string;
          end_time: string;
          booker_name: string;
          work_group: string;
          topic: string;
          created_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<MeetingRoomReservation, 'id' | 'created_at'>>;
        Relationships: [];
      };
      it_assets: {
        Row: ItAsset;
        Insert: {
          id?: string;
          source_row_number?: number | null;
          asset_code: string;
          computer_name?: string | null;
          machine_brand_model?: string | null;
          asset_type?: string | null;
          operating_system?: string | null;
          office_software?: string | null;
          cpu?: string | null;
          mainboard?: string | null;
          memory_gb?: number | null;
          graphics?: string | null;
          video_memory?: string | null;
          disk1_type?: string | null;
          disk1_product?: string | null;
          disk1_drive_letters?: string | null;
          disk1_hours?: number | null;
          disk2_type?: string | null;
          disk2_product?: string | null;
          disk2_drive_letters?: string | null;
          disk2_hours?: number | null;
          total_disk_hours?: number | null;
          monitor1_brand?: string | null;
          monitor1_manufacture_date?: string | null;
          monitor2_brand?: string | null;
          monitor2_serial_number?: string | null;
          monitor2_manufacture_date?: string | null;
          user_name?: string | null;
          user_position?: string | null;
          work_group?: string | null;
          received_date?: string | null;
          received_date_raw?: string | null;
          ups_asset_code?: string | null;
          ups_received_date?: string | null;
          ups_received_date_raw?: string | null;
          source_asset_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ItAsset, 'id' | 'created_at'>>;
        Relationships: [];
      };
      it_asset_evaluation_settings: {
        Row: ItAssetEvaluationSettings;
        Insert: {
          id?: string;
          criteria: Record<string, unknown>;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ItAssetEvaluationSettings, 'id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_categories: {
        Row: SpdServiceCategory;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SpdServiceCategory, 'id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_request_subjects: {
        Row: SpdServiceRequestSubject;
        Insert: {
          id?: string;
          category_id: string;
          subject: string;
          is_active?: boolean;
          requires_booking_date?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SpdServiceRequestSubject, 'id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_tickets: {
        Row: SpdServiceTicket;
        Insert: {
          id?: string;
          ticket_no: string;
          requester_id: string;
          requester_name: string;
          requester_department?: string | null;
          requester_phone: string;
          category_id?: string | null;
          category_name: string;
          urgency?: SpdServiceUrgency;
          status?: SpdServiceTicketStatus;
          subject: string;
          description: string;
          requested_service_date?: string | null;
          assigned_to?: string | null;
          assigned_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          problem_cause?: string | null;
          resolution_method?: string | null;
          resolution_result?: string | null;
          resolution_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SpdServiceTicket, 'id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_ticket_timeline: {
        Row: SpdServiceTicketTimeline;
        Insert: {
          id?: string;
          ticket_id: string;
          actor_id?: string | null;
          action: string;
          from_status?: SpdServiceTicketStatus | null;
          to_status?: SpdServiceTicketStatus | null;
          note?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Omit<SpdServiceTicketTimeline, 'id' | 'ticket_id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_satisfaction_surveys: {
        Row: SpdServiceSatisfactionSurvey;
        Insert: {
          id?: string;
          ticket_id: string;
          requester_id: string;
          speed_rating: number;
          quality_rating: number;
          courtesy_rating: number;
          overall_rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<SpdServiceSatisfactionSurvey, 'id' | 'ticket_id' | 'requester_id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_notification_settings: {
        Row: SpdServiceNotificationSettings;
        Insert: {
          id?: string;
          setting_key: string;
          setting_value?: string | null;
          is_secret?: boolean;
          is_active?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SpdServiceNotificationSettings, 'id' | 'created_at'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      list_training_report_records: {
        Args: { p_year?: number | null };
        Returns: Array<TrainingRecord & {
          personnel_name: string;
          employee_code: string | null;
          position: string;
          department: string;
          work_group: string;
          certificate_name: string | null;
          certificate_link: string | null;
        }>;
      };
      list_mfa_enforcement_users: {
        Args: Record<string, never>;
        Returns: Array<{
          user_id: string;
          full_name: string;
          email: string | null;
          role: UserRole;
          status: ProfileStatus;
          mfa_required: boolean;
          mfa_required_at: string | null;
          mfa_required_by: string | null;
          mfa_enabled: boolean;
        }>;
      };
      set_mfa_requirement: {
        Args: { target_user_ids: string[]; required: boolean };
        Returns: number;
      };
      create_training_record_with_details: {
        Args: {
          p_user_id: string;
          p_course: string;
          p_category: string;
          p_subcategory: string | null;
          p_organizer: string;
          p_date: string;
          p_year: number;
          p_certificate_name: string | null;
          p_certificate_link: string | null;
          p_development_area: string | null;
          p_skill_group: string | null;
          p_target_direction: string | null;
        };
        Returns: string;
      };
      generate_spd_service_ticket_no: {
        Args: {
          category_label: string;
          created_on?: string;
        };
        Returns: string;
      };
      get_spd_service_ai_chatgpt_booking_calendar: {
        Args: {
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Array<Pick<SpdServiceTicket, 'id' | 'requester_name' | 'requester_department' | 'subject' | 'requested_service_date' | 'created_at'>>;
      };
      update_own_profile_details: {
        Args: {
          p_employee_code: string;
          p_full_name: string;
          p_position: string;
          p_department: string;
          p_work_group: string;
          p_gender: 'male' | 'female' | null;
          p_education: 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก' | null;
          p_birth_date: string | null;
          p_start_work_date: string | null;
          p_employment_type:
            | 'ข้าราชการ'
            | 'พนักงานราชการ'
            | 'พนักงานกระทรวงสาธารณสุข'
            | 'ลูกจ้างชั่วคราว'
            | 'จ้างเหมาบริการฯ (พขร.)'
            | null;
        };
        Returns: void;
      };
      submit_smartdsp_survey: {
        Args: {
          target_survey_id: string;
          submitted_answers: Array<{
            question_id: string;
            rating_value?: number;
            text_value?: string;
          }>;
        };
        Returns: string;
      };
      save_smartdsp_survey_questions: {
        Args: {
          target_survey_id: string;
          submitted_questions: Array<{
            id: string;
            position: number;
            question_type: SmartDspSurveyQuestionType;
            prompt: string;
            dimension?: string | null;
            help_text?: string | null;
            is_required: boolean;
            is_active: boolean;
          }>;
        };
        Returns: undefined;
      };
      submit_smartdsp_survey_with_context: {
        Args: {
          target_survey_id: string;
          submitted_answers: Array<{
            question_id: string;
            rating_value?: number;
            text_value?: string;
          }>;
          respondent_context: {
            respondent_role: string;
            respondent_role_other?: string;
            usage_frequency: string;
            used_services: string[];
            used_services_other?: string;
            custom_answers: Record<string, SmartDspSurveyCustomContextAnswer>;
          };
          consent_record_id: string;
        };
        Returns: string;
      };
      accept_smartdsp_survey_pdpa: {
        Args: {
          target_survey_id: string;
          consent_confirmation: {
            acknowledged: boolean;
            consented: boolean;
          };
        };
        Returns: string;
      };
      delete_smartdsp_survey_response: {
        Args: {
          target_response_id: string;
        };
        Returns: undefined;
      };
      clear_smartdsp_survey_round_data: {
        Args: {
          target_survey_id: string;
        };
        Returns: undefined;
      };
      complete_smartdsp_survey_respondent_context: {
        Args: {
          target_response_id: string;
          respondent_context: {
            respondent_role: string;
            respondent_role_other?: string;
            usage_frequency: string;
            used_services: string[];
            used_services_other?: string;
            custom_answers: Record<string, SmartDspSurveyCustomContextAnswer>;
          };
        };
        Returns: undefined;
      };
      clone_smartdsp_survey: {
        Args: {
          source_survey_id: string;
        };
        Returns: string;
      };
      list_force_password_change_users: {
        Args: Record<string, never>;
        Returns: Array<{
          user_id: string;
          full_name: string;
          email: string | null;
          role: UserRole;
          status: ProfileStatus;
          force_password_change: boolean;
          force_password_change_requested_at: string | null;
          force_password_change_requested_by: string | null;
          password_changed_at: string | null;
        }>;
      };
      set_force_password_change: {
        Args: {
          target_user_ids?: string[] | null;
          force_change?: boolean;
        };
        Returns: number;
      };
      complete_forced_password_change: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      profile_status: ProfileStatus;
      site_content_status: SiteContentStatus;
      spd_service_ticket_status: SpdServiceTicketStatus;
      spd_service_urgency: SpdServiceUrgency;
    };
    CompositeTypes: Record<string, never>;
  };
};
