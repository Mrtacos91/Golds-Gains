import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const createClient = () => {
  return createClientComponentClient();
};

// Para uso en componentes de cliente
export const supabase = createClientComponentClient();
