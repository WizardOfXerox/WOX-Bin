declare module "sql.js" {
  type SqlStatement = {
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  };

  type SqlDatabase = {
    prepare(query: string): SqlStatement;
  };

  type SqlJsStatic = {
    Database: new (data?: Uint8Array | Buffer | number[]) => SqlDatabase;
  };

  export default function initSqlJs(config?: Record<string, unknown>): Promise<SqlJsStatic>;
}
