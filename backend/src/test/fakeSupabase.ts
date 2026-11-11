import type { SupabaseClient } from "@supabase/supabase-js";

export const TEST_USER = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "test@example.com",
} as const;

// The only token the fake accepts.
export const GOOD_TOKEN = "good-token";

export type FakeError = { message: string; code?: string };
export type FakeResult = {
  data: unknown;
  error: FakeError | null;
  count?: number | null;
};
export type Operation = "select" | "insert" | "update" | "delete";

export type RecordedCall = {
  table: string;
  operation: Operation;
  columns?: string;
  payload?: unknown;
  // The first eq() filter, and any later eq() filters in call order.
  filter?: { column: string; value: unknown };
  moreFilters?: { column: string; value: unknown }[];
  // An in() filter: the column and the values it must be one of.
  inFilter?: { column: string; values: unknown[] };
  count?: "exact";
  orders?: { column: string; ascending: boolean }[];
  range?: { from: number; to: number };
};

// A tiny stand-in for the Supabase client used by the services. It supports
// only the chains the backend uses, records each finished query, and returns
// the result programmed for the table and operation. It never uses the network.
export class FakeSupabase {
  readonly calls: RecordedCall[] = [];
  private readonly results = new Map<string, FakeResult>();
  // Results returned once each, in order, before the one from setResult().
  private readonly queues = new Map<string, FakeResult[]>();

  readonly client = {
    auth: {
      getUser: async (token: string) =>
        token === GOOD_TOKEN
          ? { data: { user: TEST_USER }, error: null }
          : { data: { user: null }, error: { message: "invalid" } },
    },
    from: (table: string) => this.query(table),
  } as unknown as SupabaseClient;

  setResult(table: string, operation: Operation, result: FakeResult) {
    this.results.set(`${table}.${operation}`, result);
  }

  // For a query that runs twice and needs a different answer each time.
  queueResult(table: string, operation: Operation, result: FakeResult) {
    const key = `${table}.${operation}`;
    this.queues.set(key, [...(this.queues.get(key) ?? []), result]);
  }

  callsFor(table: string, operation: Operation) {
    return this.calls.filter(
      (call) => call.table === table && call.operation === operation,
    );
  }

  reset() {
    this.calls.length = 0;
    this.results.clear();
    this.queues.clear();
  }

  private query(table: string) {
    const call: Partial<RecordedCall> = { table };

    const query = {
      select: (columns: string, options?: { count?: "exact" }) => {
        // After insert or update, select only chooses the returned columns.
        call.operation ??= "select";
        call.columns = columns;
        if (options?.count) call.count = options.count;
        return query;
      },
      insert: (row: unknown) => {
        call.operation = "insert";
        call.payload = row;
        return query;
      },
      update: (patch: unknown) => {
        call.operation = "update";
        call.payload = patch;
        return query;
      },
      delete: () => {
        call.operation = "delete";
        return query;
      },
      in: (column: string, values: unknown[]) => {
        call.inFilter = { column, values };
        return query;
      },
      eq: (column: string, value: unknown) => {
        if (call.filter) {
          call.moreFilters = [...(call.moreFilters ?? []), { column, value }];
        } else {
          call.filter = { column, value };
        }
        return query;
      },
      order: (column: string, options?: { ascending?: boolean }) => {
        call.orders = [
          ...(call.orders ?? []),
          { column, ascending: options?.ascending ?? true },
        ];
        return query;
      },
      range: (from: number, to: number) => {
        call.range = { from, to };
        return query;
      },
      single: async (): Promise<FakeResult> => finish(),
      maybeSingle: async (): Promise<FakeResult> => finish(),
      // Awaiting a query without single() or maybeSingle() returns a list.
      then: (
        resolve: (result: FakeResult) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(finish()).then(resolve, reject),
    };

    const finish = (): FakeResult => {
      const operation = call.operation as Operation;
      this.calls.push({ ...call, table, operation });
      const queued = this.queues.get(`${table}.${operation}`)?.shift();
      if (queued) return queued;
      return (
        this.results.get(`${table}.${operation}`) ?? {
          data: null,
          error: { message: `No fake result for ${table}.${operation}` },
        }
      );
    };

    return query;
  }
}

// One shared instance: tests program it, and the mocked createUserClient
// returns its client.
export const fakeSupabase = new FakeSupabase();
