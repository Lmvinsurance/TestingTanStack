import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  "https://aynfbxixpviadworsbmk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5bmZieGl4cHZpYWR3b3JzYm1rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk2NzMyNiwiZXhwIjoyMDk2NTQzMzI2fQ.gSXKYazAn4a7Lwcmr3Zpzi04wvZiWUCn5on_6EINTLs"
);

async function run() {
  const orderId = "19c688ee-d91d-4270-99a5-5b9558e0de79"; // ID from the user's prompt
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ payment_status: "paid", order_status: "received" })
    .eq("id", orderId)
    .select();

  console.log("Error:", error);
  console.log("Data:", data);
}

run();
