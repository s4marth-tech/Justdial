import { MessageSquarePlus, PhoneCall, Phone } from "lucide-react";

export const TYPE_LABELS: Record<string, string> = {
  ENQUIRY: "Enquire Now",
  CALLBACK_REQUEST: "Request a Callback",
  CALL: "Show Number",
};

export const TYPE_ICONS: Record<string, typeof MessageSquarePlus> = {
  ENQUIRY: MessageSquarePlus,
  CALLBACK_REQUEST: PhoneCall,
  CALL: Phone,
};

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CONVERTED: "Converted",
  NOT_INTERESTED: "Not Interested",
};

export const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  NEW: "secondary",
  CONTACTED: "outline",
  CONVERTED: "default",
  NOT_INTERESTED: "destructive",
};

export const SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  BROADCAST: "Broadcast",
};
