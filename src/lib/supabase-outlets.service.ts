import { supabase } from "@/integrations/supabase/client";

export interface Outlet {
  id: string;
  outlet_name: string;
  outlet_code: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_time: string | null;
  closing_time: string | null;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

class SupabaseOutletService {
  /**
   * Fetch all active outlets
   */
  async getOutlets(): Promise<Outlet[]> {
    const { data, error } = await supabase
      .from("outlets")
      .select("*")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("outlet_name", { ascending: true });

    if (error) {
      console.error("Error fetching outlets:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Fetch a single outlet by ID
   */
  async getOutletById(id: string): Promise<Outlet | null> {
    const { data, error } = await supabase
      .from("outlets")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error) {
      console.error("Error fetching outlet:", error);
      throw error;
    }

    return data;
  }

  /**
   * Fetch outlets by city
   */
  async getOutletsByCity(city: string): Promise<Outlet[]> {
    const { data, error } = await supabase
      .from("outlets")
      .select("*")
      .eq("city", city)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("outlet_name", { ascending: true });

    if (error) {
      console.error("Error fetching outlets by city:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Check if an outlet is currently open based on opening/closing times
   */
  isOutletOpen(outlet: Outlet): boolean {
    if (!outlet.opening_time || !outlet.closing_time) return true;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openHours, openMinutes] = outlet.opening_time.split(':').map(Number);
    const [closeHours, closeMinutes] = outlet.closing_time.split(':').map(Number);
    
    const openTime = openHours * 60 + openMinutes;
    const closeTime = closeHours * 60 + closeMinutes;
    
    return currentTime >= openTime && currentTime <= closeTime;
  }

  /**
   * Format time for display (e.g., "11:00 AM – 11:00 PM")
   */
  formatTimeRange(outlet: Outlet): string {
    if (!outlet.opening_time || !outlet.closing_time) {
      return "Hours not available";
    }
    
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };
    
    return `${formatTime(outlet.opening_time)} – ${formatTime(outlet.closing_time)}`;
  }
}

export const outletService = new SupabaseOutletService();