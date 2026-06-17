// Mocking TanStack Start Server Functions for Client-Side execution

import { supabase } from "@/integrations/supabase/client";

type ServerFnContext = {
  userId: string;
};

export function createServerFn<TInput, TOutput>(options: any) {
  let middlewareFns: any[] = [];
  let validatorFn: any = (data: any) => data;
  let handlerFn: any = async () => {};

  const builder = {
    middleware(fns: any[]) {
      middlewareFns = fns;
      return builder;
    },
    inputValidator(fn: any) {
      validatorFn = fn;
      return builder;
    },
    handler(fn: any) {
      handlerFn = fn;
      return async function execute(args?: { data?: any }) {
        try {
          const validatedData = validatorFn(args?.data);
          
          const { data: { session } } = await supabase.auth.getSession();
          let context: ServerFnContext = { userId: session?.user?.id || "unauthenticated" };
          
          // Run middlewares if we needed to (mocked)
          // For now, we simulate success
          
          // Execute handler
          return await handlerFn({ data: validatedData, context });
        } catch (err) {
          throw err;
        }
      };
    }
  };

  return builder;
}

export function useServerFn(fn: any) {
  return fn;
}

export function createMiddleware(options?: any) {
  return {
    server: (fn: any) => fn
  };
}

export function getRequest() {
  return new Request("http://localhost");
}
