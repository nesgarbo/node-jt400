# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@nesgarbo/node-jt400` is a Node.js/TypeScript wrapper for the IBM Toolbox for Java (JT400), providing a Promise-based API to interact with IBM iSeries/AS400 systems: DB2 database, IFS file system, RPG/COBOL programs, message queues, and data queues. It bridges Node.js to Java via the `java-bridge` npm package.

This is a fork of [`tryggingamidstodin/node-jt400`](https://github.com/tryggingamidstodin/node-jt400). Starting with v6.x this fork diverges significantly: the Java bridge was migrated from `node-java` to `java-bridge`, and JDBC-level `commit`/`rollback`/`createStatement` were added to `BaseConnection` for ODBC compatibility.

## Commands

```bash
npm run build          # Compile TypeScript → dist-esm/ and dist-cjs/ (via tsup)
npm run build-dev      # Watch mode build
npm run build-java     # Recompile Java wrapper (requires Ant; only needed if Java sources change)

npm run test           # Unit tests via Vitest
npm run test-dev       # Watch unit tests
npm run integration-test  # Integration tests — requires a live AS/400 connection

npm run lint           # ESLint on ts-src/**/*.ts
npm run format         # Prettier auto-fix
npm run format-verify  # Check formatting without writing

npm run ci             # Full pipeline: clean → build → test → test-cjs → integration-test → integration-cjs-test → test-compatibility
```

Run a single test file:
```bash
npx vitest run ts-src/unit-test/sqlutil-spec.ts
```

- Pre-commit hook: `lint` + `format-verify`
- Pre-push hook: `build` + `test`
- `test-mjs.mjs` / `test-cjs.cjs`: module format smoke tests (verify JAR loading and dual-module export, not logic tests)

## Architecture

### Dual-module output

`tsup` produces both ESM (`dist-esm/`) and CJS (`dist-cjs/`) builds from `ts-src/`. Each output directory gets its own `package.json` setting `"type"`. Post-build hooks in `tsup.config.ts` write these `package.json` files. Each source file compiles to a corresponding output file (no bundling/splitting). TypeScript declarations: `.d.ts` for ESM, `.d.cts` for CJS.

### Layer stack

```
ts-src/index.ts              ← public API: pool(), connect(), useInMemoryDb()
ts-src/lib/connection.ts     ← full Connection (extends BaseConnection + programs/IFS/queues/transaction)
ts-src/lib/baseConnection.ts ← DB operations: query, update, execute, commit, rollback, streams
ts-src/java/index.ts         ← initializes JVM singleton, loads JARs, imports Java classes
java/src/nodejt400/          ← thin Java wrappers over JT400 library
java/lib/jt400wrap.jar       ← compiled Java wrappers (pre-built, committed)
java/lib/jt400.jar           ← IBM Toolbox for Java
```

### Key source files

| File | Role |
|------|------|
| `ts-src/index.ts` | Public entry: `pool`, `connect`, `useInMemoryDb` |
| `ts-src/lib/baseConnection.ts` | Core DB: `query`, `update`, `execute`, `insertList`, streams, `commit`, `rollback`, `createStatement` |
| `ts-src/lib/baseConnection.types.ts` | `BaseConnection`, `Param`, `QueryOptions`, `Statement` interfaces |
| `ts-src/lib/connection.ts` | Extends BaseConnection: `transaction`, `defineProgram`, `ifs()`, `openMessageQ`, `createKeyedDataQ`, metadata |
| `ts-src/lib/connection.types.ts` | `Connection` interface and all AS400-specific types |
| `ts-src/lib/inMemoryConnection.ts` | HSQLDB-backed connection for unit testing; supports program mocking |
| `ts-src/java/JT400.ts` | TypeScript interfaces for every Java class exposed via `java-bridge` |
| `ts-src/lib/ifs/` | IFS read/write streams and file operations |
| `ts-src/lib/insertList.ts` | Two batch-insert strategies (see below) |
| `ts-src/lib/jdbcstream.ts` | JDBC result set → Node.js Readable |
| `ts-src/lib/jdbcwritestream.ts` | Node.js Writable → JDBC batchUpdate (object mode, bufferSize 100) |
| `ts-src/lib/sqlutil.ts` | Generates parameterized INSERT statements |
| `ts-src/lib/streamTransformers.ts` | Converts `string[][]` stream to object stream using column metadata |
| `ts-src/lib/handleError.ts` | Categorizes Java exceptions as OperationalError vs ProgrammerError |
| `ts-src/lib/logger.ts` | Logger interface + default no-op implementation |

## Non-obvious behaviors

### Java bridge singleton

`initJavaBridge()` is called once and cached. All connections in the process share the same JVM. The bridge loads these JARs: `jt400.jar`, `jt400wrap.jar`, `json-simple-1.1.1.jar`, `hsqldb.jar`. JVM options include `-Dcom.ibm.as400.access.AS400.guiAvailable=false` and `--enable-native-access=ALL-UNNAMED`.

### Config defaults and environment variables

```ts
pool(config, options?)
connect(config, options?)
```

Default config applied before user config (user overrides):
- `naming: 'system'` — IBM iSeries naming convention
- `host`, `user`, `password` fallback to env vars `AS400_HOST`, `AS400_USERNAME`, `AS400_PASSWORD`

`options` accepts a `logger` (injected into all DB operations). If omitted, a no-op logger is used. Logging uses `process.hrtime.bigint()` for nanosecond-precision durations.

### `pool()` is synchronous, `connect()` is async

`pool()` calls the Java-side `createPoolSync()` and returns immediately. `connect()` awaits `createConnection()` and returns a Promise.

### IPC via JSON

All parameters and results cross the Node↔Java boundary as JSON strings. `Param[]` arrays are `JSON.stringify`'d before being sent; results are `JSON.parse`'d on return. `Date` objects are converted to `"YYYY-MM-DD HH:mm:ss"` format (ISO without `T` and `Z`) before serialization.

### Default `trim: true`

`query()` trims string values by default. Pass `{ trim: false }` in `QueryOptions` to disable.

### `QueryOptions`

```ts
interface QueryOptions {
  trim?: boolean      // trim string values (default: true)
  cursor?: boolean    // ODBC cursor mode (fork addition, v6.0.3)
  fetchSize?: number  // rows per fetch in cursor mode (v6.0.3)
}
```

### Two transaction APIs — do not confuse them

- **`Connection.transaction(fn)`** — high-level: calls `createTransactionSync()` on Java to get a dedicated `Transaction` connection object, wraps `fn` in try/catch, auto-commits or auto-rolls back, then calls `end()`. This is the standard path.
- **`BaseConnection.commit()` / `BaseConnection.rollback()`** — low-level fork additions (v6.0.2): call commit/rollback directly on the underlying `JDBCConnection`. Intended for ODBC-compatibility scenarios where the caller manages the transaction boundary.

### `queryCursor<T>()` — memory-efficient row iteration

`queryCursor<T>(sql, params?)` returns an `AsyncIterable<T>` that fetches rows one-by-one via `StatementWrap.next()`. Unlike `query()` which loads all rows into memory, `queryCursor` is suitable for large result sets:

```ts
for await (const row of db.queryCursor<{ NAME: string }>('SELECT NAME FROM tbl')) {
  console.log(row.NAME)
}
```

The underlying `StatementWrap` is automatically closed when iteration completes or throws. Implemented in `ts-src/lib/baseConnection.ts` using `jdbcConnection.execute()` + `st.next()`.

### `Statement` interface (returned by `execute` and `createStatement`)

| Method | Description |
|--------|-------------|
| `asArray()` | All rows as `string[][]` |
| `asStream(options?)` | Node.js `Readable` of raw JSON chunks; default bufferSize 100 |
| `asObjectStream(options?)` | Node.js `Readable` of parsed row objects (requires metadata roundtrip) |
| `asIterable()` | `AsyncIterable<string[]>` for `for await...of` |
| `updated()` | Rows affected (for DML) |
| `metadata()` | Column descriptors (`Metadata[]`) |
| `isQuery()` | Whether statement is a SELECT |
| `close()` | Release statement |

### Two `insertList` strategies

- **`createInsertListInOneStatment`** (used by real connections): Single `SELECT id FROM NEW TABLE(INSERT INTO … VALUES …)` round-trip. Returns IDs. Column name extracted with `.toUpperCase()`.
- **`createStandardInsertList`** (used by in-memory connection): Sequential `insertAndGetId()` calls reduced into a promise chain. Slower but works on HSQLDB.

`sqlutil.ts` derives column names from `Object.keys(rows[0])` — all rows must have the same keys in the same order.

### IFS path handling

`ifs().createWriteStream(filePath, options?)` internally splits the path into `dirname` + `basename` before passing to Java. Accept `options.append` (boolean) and `options.ccsid` (number) for encoding.

### IFS read stream buffer conversion

The `IfsReadStream` wrapper handles three return types from `java-bridge` (`Buffer`, `Uint8Array`, or unknown) because the bridge's auto-conversion is not guaranteed across JVM versions. An empty buffer is treated as EOF.

### Program calls

`defineProgram(options)` returns a function `run(params, timeout = 3)`. Default timeout is **3 seconds**. The old `pgm()` method is deprecated — use `defineProgram`.

### In-memory connection and program mocking

`useInMemoryDb()` returns an extended connection with a `mockPgm(name, fn)` method for injecting mock program implementations. Mock functions can return a value or a Promise. Method chains are supported (`mockPgm(...).mockPgm(...)`).

### Error categorization

`handleError` wraps Java exceptions via `oops-error`:
- Tries `err.cause.getMessageSync()`, then `err.getMessageSync()`, then `err.message`
- Parses the message to extract the substring between `: ` and first `\n`
- **OperationalError**: connection/network errors or `UnknownHostException`
- **ProgrammerError**: everything else (SQL syntax, data errors, etc.)

### `jdbcwritestream` buffering

`createWriteStream(sql, options?)` is object-mode. Rows are buffered (default 100) and flushed as a `batchUpdate()` call. Final flush happens in the `_flush` hook (FlushWritable, not plain Writable).

## Java wrapper rebuild

Java sources in `java/src/nodejt400/` only need recompiling if you change them. Run `npm run build-java` (requires Ant). The pre-built `java/lib/jt400wrap.jar` is committed and used by default. Java target is 1.8.

## Code style

- TypeScript strict mode, ES2022 target
- 2-space indent, single quotes, no semicolons, trailing commas (Prettier enforced)
- No explicit `any` — use proper types or generics
- Unused parameters allowed only if prefixed with `_`
- Promises must be handled (no floating promises, ESLint warning)
