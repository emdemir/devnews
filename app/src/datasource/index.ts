import { Pool, PoolClient, QueryResult } from "pg";
import debugFactory = require("debug");

const debug = debugFactory("devnews:datasource");

// The connection information is gathered from environment variables described in
// docker-compose.yml. For more information, see:
// https://node-postgres.com/features/connecting
const pool = new Pool();

// Type definitions for callbacks.
type QueryCallback<T> = (err: Error, result: QueryResult<T>) => void;

// Export common operations, so it is easy to add debugging later.

/// Query is for single one-shot queries.
// Overloads
export function query<T>(text: string, params: any): Promise<QueryResult<T>>;
export function query<T>(text: string, params: any, callback: QueryCallback<T>): void;
// Definition
export function query<T = any>(text: string, params: any, callback?: QueryCallback<T>) {
    if (process.env.DEBUG_QUERIES)
        debug("executing query:", text.replace(/\s+/g, " "), "params:", params);

    if (callback) {
        return pool.query(text, params, callback);
    } else {
        return pool.query(text, params);
    }
}

// getClient is for performing transactions.
export const getClient = (): Promise<PoolClient> => pool.connect();
