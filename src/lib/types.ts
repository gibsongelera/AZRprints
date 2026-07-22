export type UserRole = "admin" | "user";

export type OrderType = "document" | "photo" | "large";
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

export interface Notification {
  id: number;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  created_at: string;
}
