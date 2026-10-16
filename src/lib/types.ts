export type UserRole = "admin" | "user";

export type OrderType = "document" | "photo";
export type OrderColor = "bw" | "color";
export type OrderStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  student_id: string | null;
  college: string | null;
  department: string | null;
  phone: string | null;
  avatar_url?: string | null;
  email?: string;
  created_at: string;
}

export interface Pricing {
  id: number;
  document_bw: number;
  document_color: number;
  photo: number;
  large_format: number;
  binding: number;
  updated_at: string;
}

export interface ShopSettings {
  id: number;
  shop_name: string;
  tagline: string;
  open_time: string;
  close_time: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string | null;
  pages: number;
  document_pages: number;
  photo_pages: number;
  content_label: string | null;
  type: OrderType;
  color: OrderColor;
  copies: number;
  amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  paymongo_link_id: string | null;
  paymongo_checkout_url: string | null;
  created_at: string;
  profiles?: Pick<Profile, "name" | "student_id" | "email"> | null;
}

export type PrintJobStatus =
  | "queued"
  | "printing"
  | "completed"
  | "failed"
  | "cancelled";

export interface PrintJob {
  id: string;
  order_id: string;
  status: PrintJobStatus;
  printer_name: string;
  copies: number;
  attempts: number;
  last_error: string | null;
  locked_by: string | null;
  locked_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrinterSettings {
  id: number;
  auto_print_enabled: boolean;
  direct_print_enabled: boolean;
  default_printer_name: string;
  poll_interval_seconds: number;
  max_job_retries: number;
  spool_retention_hours: number;
  updated_at: string;
}

/** 'all' = everyone, 'users' = students only, 'admin' = admins only (broadcasts) */
export type NotificationAudience = "all" | "users" | "admin";

export interface Notification {
  id: number;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  audience?: NotificationAudience;
  link?: string | null;
  created_at: string;
}

export type TicketCategory =
  | "order_issue"
  | "payment"
  | "printer"
  | "report"
  | "general";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "name" | "student_id" | "email"> | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "user" | "admin";
  body: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  edited_at?: string | null;
  created_at: string;
}
