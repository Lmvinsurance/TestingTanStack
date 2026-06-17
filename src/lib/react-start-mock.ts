// Mocking TanStack Start Server Functions for Client-Side execution

import { supabase } from "@/integrations/supabase/client";

type ServerFnContext = {
  userId: string;
};

type HandlerArg = { data: any; context: any };
type HandlerFn = (arg: HandlerArg) => any;
type MiddlewareArg = { next: any; data?: any; context?: any };
type MiddlewareFn = (arg: MiddlewareArg) => any;

interface ServerFnBuilder {
  middleware(fns: any[]): ServerFnBuilder;
  inputValidator(fn: (data: any) => any): ServerFnBuilder;
  handler(fn: HandlerFn): (args?: { data?: any }) => Promise<any>;
}

export function createServerFn<TInput = any, TOutput = any>(_options?: any): ServerFnBuilder {
  let validatorFn: (data: any) => any = (data: any) => data;
  let handlerFn: HandlerFn = async () => {};

  const builder: ServerFnBuilder = {
    middleware(_fns: any[]) {
      return builder;
    },
    inputValidator(fn: (data: any) => any) {
      validatorFn = fn;
      return builder;
    },
    handler(fn: HandlerFn) {
      handlerFn = fn;
      return async function execute(args?: { data?: any }) {
        const validatedData = validatorFn(args?.data);
        const { data: { session } } = await supabase.auth.getSession();
        const context: ServerFnContext = { userId: session?.user?.id || "unauthenticated" };
        return await handlerFn({ data: validatedData, context });
      };
    },
  };

  return builder;
}

export function useServerFn(fn: any) {
  return fn;
}

export function createMiddleware(_options?: any) {
  return {
    server: (fn: MiddlewareFn) => fn,
    client: (fn: MiddlewareFn) => fn,
  };
}

export function getRequest() {
  return new Request("http://localhost");
}
