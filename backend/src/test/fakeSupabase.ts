import type { SupabaseClient } from "@supabase/supabase-js";

export const TEST_USER = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "test@example.com",
} as const;

// The only token the fake accepts.
export const GOOD_TOKEN = "good-token";

export type FakeError = { message: string; code?: string };
export type FakeResult = { data: unknown; error: FakeError | null };
export type Operation = "select" | "insert" | "update";

export type RecordedCall = {
  table: string;
  operation: Operation;
  columns?: string;
  payload?: unknown;
  filter?: { column: string; value: unknown };
};

// A tiny stand-in for the Supabase client used by the services. It supports
// only the chains the backend uses, records each finished query, and returns
// the result programmed for the table and operation. It never uses the network.
export class FakeSupabase {
  readonly calls: RecordedCall[] = [];
  private readonly results = new Map<string, FakeResult>();

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

  callsFor(table: string, operation: Operation) {
    return this.calls.filter(
      (call) => call.table === table && call.operation === operation,
    );
  }

  reset() {
    this.calls.length = 0;
    this.results.clear();
  }

  private query(table: string) {
    const call: Partial<RecordedCall> = { table };

    const query = {
      select: (columns: string) => {
        // After insert or update, select only chooses the returned columns.
        call.operation ??= "select";
        call.columns = columns;
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
      eq: (column: string, value: unknown) => {
        call.filter = { column, value };
        return query;
      },
      single: async (): Promise<FakeResult> => {
        const operation = call.operation as Operation;
        this.calls.push({ ...call, table, operation });
        return (
          this.results.get(`${table}.${operation}`) ?? {
            data: null,
            error: { message: `No fake result for ${table}.${operation}` },
          }
        );
      },
    };

    return query;
  }
}

// One shared instance: tests program it, and the mocked createUserClient
// returns its client.
export const fakeSupabase = new FakeSupabase();
