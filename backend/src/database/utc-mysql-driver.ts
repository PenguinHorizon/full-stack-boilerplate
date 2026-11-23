import * as mysql2 from 'mysql2';

/**
 * mysql2, with every pooled connection pinned to UTC.
 *
 * `timezone: 'Z'` only tells mysql2 how to *parse* dates. The MySQL session
 * itself still runs in the server's zone (e.g. SYSTEM = PKT, UTC+5), so
 * `CURRENT_TIMESTAMP` defaults and TIMESTAMP→string conversion produced local
 * wall-clock values that mysql2 then read as UTC — every timestamp came back
 * hours off (seen as "signed in 5 hours from now" on the dashboard).
 *
 * The `connection` event fires once per new physical connection, before the
 * pool hands it out, and mysql2 queues commands per connection, so the SET
 * always runs before the application's first query on that connection.
 */
export const utcMysqlDriver = {
  ...mysql2,
  createPool(config: mysql2.PoolOptions) {
    const pool = mysql2.createPool(config);
    pool.on('connection', (connection) => {
      connection.query("SET time_zone = '+00:00'", (error) => {
        if (error) {
          // Surface loudly but do not crash the process from an event handler.
          console.error(`Failed to pin MySQL session to UTC: ${error.message}`);
        }
      });
    });
    return pool;
  },
};
