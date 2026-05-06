# @nesgarbo/node-jt400

Node.js/TypeScript wrapper for the IBM Toolbox for Java (JT400). Provides a Promise-based API to interact with IBM iSeries/AS400 systems: DB2 database, IFS filesystem, RPG/COBOL programs, message queues, and data queues.

Bridges Node.js to the JVM via [`java-bridge`](https://www.npmjs.com/package/java-bridge). Dual ESM/CJS package with full TypeScript declarations.

## Requirements

- Node.js 18+
- Java 8+ (JRE or JDK) installed and available in `PATH`

## Install

```sh
npm install @nesgarbo/node-jt400
```

## Module system

Both ESM and CommonJS are supported:

```ts
// ESM
import { pool, connect, useInMemoryDb } from '@nesgarbo/node-jt400'
```

```js
// CommonJS
const { pool, connect, useInMemoryDb } = require('@nesgarbo/node-jt400')
```

## Connecting

### Connection pool (synchronous)

```ts
import { pool } from '@nesgarbo/node-jt400'

const db = pool({
  host: 'myhost',
  user: 'myuser',
  password: 'secret',
})
```

### Single connection (async)

```ts
import { connect } from '@nesgarbo/node-jt400'

const db = await connect({
  host: 'myhost',
  user: 'myuser',
  password: 'secret',
})
```

### Configuration

`host`, `user`, and `password` fall back to environment variables `AS400_HOST`, `AS400_USERNAME`, and `AS400_PASSWORD` when omitted. The `naming` option defaults to `'system'` (IBM iSeries naming convention).

Any [JT400 JDBC property](https://www.ibm.com/support/knowledgecenter/en/ssw_ibm_i_73/rzahh/javadoc/com/ibm/as400/access/doc-files/JDBCProperties.html) can be passed in the config object:

```ts
const db = pool({
  host: 'myhost',
  user: 'myuser',
  password: 'secret',
  'translate binary': 'true',
  trace: 'true',
})
```

### Logging

Pass any pino-compatible logger as the second argument:

```ts
import pino from 'pino'
import { pool } from '@nesgarbo/node-jt400'

const db = pool({}, { logger: pino() })
```

---

## SQL / Database

### Query

Returns rows as an array of objects. Column names are uppercased.

```ts
const rows = await db.query<{ FIELD1: number; FIELD2: string }>(
  'SELECT field1, field2 FROM foo WHERE bar=? AND baz=?',
  [1, 'a'],
)
console.log(rows[0].FIELD1)
```

String values are automatically trimmed. Disable with `{ trim: false }`:

```ts
const rows = await db.query('SELECT name FROM foo', [], { trim: false })
```

### Update / Delete

```ts
const rowsUpdated = await db.update('UPDATE foo SET bar=? WHERE baz=?', [1, 'a'])
const rowsDeleted = await db.update('DELETE FROM foo WHERE bar=?', [1])
```

### Insert

```ts
// Insert and get the generated identity value
const id = await db.insertAndGetId('INSERT INTO foo (bar, baz) VALUES(?,?)', [2, 'b'])
```

### Insert list

Inserts multiple rows in a single round-trip and returns the generated IDs. All rows must have the same keys in the same order.

```ts
const ids = await db.insertList('foo', 'fooid', [
  { FIELD1: 1, FIELD2: 'a' },
  { FIELD1: 2, FIELD2: 'b' },
])
// ids: [1, 2]
```

### Batch update

Executes a parameterized statement once per row in a single JDBC batch, returning the number of affected rows for each.

```ts
const counts = await db.batchUpdate('INSERT INTO foo (f1, f2) VALUES(?,?)', [
  [1, 'a'],
  [2, 'b'],
])
// counts: [1, 1]
```

### Complex types (CLOB / BLOB)

Strings, numbers, and `null` are handled automatically. For CLOB or BLOB pass a typed object:

```ts
await db.update('INSERT INTO foo (id, notes, doc) VALUES(?,?,?)', [
  1,
  { type: 'CLOB', value: 'A very long string...' },
  { type: 'BLOB', value: base64String },
])
```

For BLOB, pass the base64 string representation of the file.

### Date parameters

Pass JavaScript `Date` objects directly — they are converted to `"YYYY-MM-DD HH:mm:ss"` before being sent to JDBC:

```ts
await db.update('INSERT INTO foo (id, ts) VALUES(?,?)', [1, new Date()])
```

---

## Streaming

### SQL read stream

Returns a `Readable` emitting raw JSON chunks (one JSON array per row). Combine with `JSONStream` to pipe rows elsewhere:

```ts
import JSONStream from 'JSONStream'

db.createReadStream('SELECT f1, f2 FROM foo WHERE bar=?', [1])
  .pipe(JSONStream.parse([true]))
  .pipe(db.createWriteStream('INSERT INTO bar (f1, f2) VALUES(?,?)'))
```

### SQL write stream

Returns an object-mode `Writable`. Write plain arrays of parameter values; rows are buffered (default 100) and flushed as a `batchUpdate`:

```ts
const ws = db.createWriteStream('INSERT INTO bar (f1, f2) VALUES(?,?)')
ws.write([1, 'a'])
ws.write([2, 'b'])
ws.end()
```

### Object stream

```ts
const stmt = await db.execute('SELECT field1, field2 FROM foo', [])
const objectStream = await stmt.asObjectStream()
// objectStream emits plain JS objects per row
```

### Async iterable (row by row)

`execute()` returns a `Statement` whose `asIterable()` yields each row as a `string[]`:

```ts
const stmt = await db.execute('SELECT f1, f2 FROM foo WHERE bar=?', [1])
for await (const [f1, f2] of stmt.asIterable()) {
  console.log(f1, f2)
}
```

### Cursor (lazy row-by-row)

`queryCursor<T>()` returns an `AsyncIterable<T>` that fetches rows one at a time without loading the full result set. The underlying statement is automatically closed when iteration ends or is abandoned.

```ts
for await (const row of db.queryCursor<{ ID: number; NAME: string }>(
  'SELECT id, name FROM bigtable ORDER BY id',
)) {
  process.stdout.write(row.NAME + '\n')
}
```

---

## `Statement` API

`execute(sql, params?)` returns a `Statement` with the following methods:

| Method | Description |
|--------|-------------|
| `asArray()` | All rows as `string[][]` |
| `asStream(options?)` | Node.js `Readable` of raw JSON chunks |
| `asObjectStream(options?)` | Node.js `Readable` of parsed row objects |
| `asIterable()` | `AsyncIterable<string[]>` for `for await...of` |
| `updated()` | Rows affected (DML statements) |
| `metadata()` | Column descriptors (`Metadata[]`) |
| `isQuery()` | Whether the statement is a SELECT |
| `close()` | Release the statement |

---

## Transactions

The transaction callback receives a connection object with the same API as the pool. The transaction is committed on success and rolled back on any thrown error.

```ts
await db.transaction(async (tx) => {
  const fooId = await tx.insertAndGetId('INSERT INTO foo (name) VALUES(?)', ['bar'])
  await tx.update('INSERT INTO baz (fooid, val) VALUES(?,?)', [fooId, 42])
})
```

### Low-level commit / rollback

For ODBC-compatibility scenarios where you manage the transaction boundary yourself:

```ts
await db.update('INSERT INTO foo (name) VALUES(?)', ['bar'])
await db.commit()
// or:
await db.rollback()
```

---

## IFS Filesystem

```ts
const ifs = db.ifs()
```

### Read a file

```ts
import { createWriteStream } from 'fs'

ifs.createReadStream('/home/myuser/report.txt').pipe(createWriteStream('./report.txt'))
```

### Write a file

```ts
import { createReadStream } from 'fs'

createReadStream('./local.txt').pipe(ifs.createWriteStream('/home/myuser/remote.txt'))
```

Append mode and CCSID encoding:

```ts
ifs.createWriteStream('/home/myuser/log.txt', { append: true, ccsid: 1208 })
```

### Delete a file

```ts
const deleted = await ifs.deleteFile('/home/myuser/old.txt') // true | false
```

### Other IFS operations

```ts
await ifs.moveFile('/tmp/source.txt', '/home/myuser/dest.txt')
const files = await ifs.listFiles('/home/myuser')
const meta = await ifs.fileMetadata('/home/myuser/report.txt')
```

---

## Programs (RPG / COBOL)

Define the program once with its parameter schema, then call the returned function.

```ts
const myProgram = db.defineProgram({
  programName: 'MYPGM',
  libraryName: 'MYLIB',      // optional, defaults to *LIBL
  paramsSchema: [
    { type: 'DECIMAL', precision: 10, scale: 0, name: 'myId' },
    { type: 'NUMERIC', precision: 8,  scale: 0, name: 'myDate' },
    { type: 'NUMERIC', precision: 12, scale: 2, name: 'myAmount' },
    { type: 'CHAR',    precision: 32, scale: 0, name: 'myString' },
  ],
})

const result = await myProgram(
  {
    myId: 123,
    myDate: '20240101',
    myAmount: 1234.56,
    myString: 'hello',
  },
  10, // optional timeout in seconds (default: 3, pass 0 to disable)
)
```

Type mapping:

| Schema type | Java type |
|-------------|-----------|
| `DECIMAL`   | `AS400PackedDecimal` |
| `NUMERIC`   | `AS400ZonedDecimal` |
| anything else | `AS400Text` |

> `pgm()` is deprecated. Use `defineProgram()`.

---

## Keyed Data Queues

```ts
const dq = db.createKeyedDataQ({ name: 'MYDATAQ' })

// Write
await dq.write('mykey', 'hello')

// Read (wait up to 5 seconds)
const data = await dq.read({ key: 'mykey', wait: 5 })
console.log(data) // 'hello'
```

Read with a reply queue (writeKeyLength enables response routing):

```ts
void dq.read({ key: 'mykey', wait: 10, writeKeyLength: 11 }).then(async (res) => {
  const { data, write } = res as { data: string; write: (d: string) => Promise<void> }
  await write('pong')
})

await dq.write('mykey', 'returnkey  ping')
const reply = await dq.read({ key: 'returnkey  ', wait: 10 })
```

Pass `wait: -1` to wait indefinitely until a message arrives.

---

## Message Queues

```ts
const path = `/QSYS.LIB/${process.env.AS400_USERNAME}.MSGQ`
const msgq = await db.openMessageQ({ path })

await msgq.sendInformational('Hello from Node.js')

const msg = await msgq.read()
console.log(msg?.text)
```

---

## Message Files

```ts
const file = await db.openMessageFile({
  path: '/QSYS.LIB/MYLIB.LIB/MYMSGF.MSGF',
})
const msg = await file.read({ messageId: 'AMX0051' })
console.log(await msg.getText())
```

---

## Error handling

All errors are wrapped using [`oops-error`](https://github.com/tryggingamidstodin/oops-error) and categorized:

- **`OperationalError`** — connection/network failures (e.g. `UnknownHostException`)
- **`ProgrammerError`** — SQL syntax errors, wrong parameter counts, data errors, etc.

```ts
try {
  await db.query('SELECT * FROM foo WHERE bar=?', [1, 'extra-param'])
} catch (err) {
  console.log(err.category) // 'ProgrammerError'
  console.log(err.message)  // e.g. 'Descriptor index not valid.'
  console.log(err.cause)    // original Java exception
}
```

---

## Testing with in-memory DB

`useInMemoryDb()` returns a connection backed by HSQLDB (an in-memory Java database). Use it in unit tests without an AS400 connection.

```ts
import { useInMemoryDb } from '@nesgarbo/node-jt400'

const db = useInMemoryDb()

await db.update('CREATE TABLE foo (id INT GENERATED ALWAYS AS IDENTITY, name VARCHAR(100))')
await db.update('INSERT INTO foo (name) VALUES(?)', ['bar'])
const rows = await db.query<{ ID: number; NAME: string }>('SELECT id, name FROM foo')
```

### Mocking program calls

```ts
const db = useInMemoryDb()

db.mockPgm('MYPGM', (input) => {
  return [{ result: input.myId * 2 }]
})

const run = db.defineProgram({ programName: 'MYPGM', paramsSchema: [] })
const result = await run({ myId: 5 })
```

Mock functions can return a value or a `Promise`. Calls can be chained:

```ts
db.mockPgm('PGM1', () => [{ ok: true }]).mockPgm('PGM2', () => [{ ok: true }])
```

---

## Metadata

```ts
const columns = await db.getColumns({
  schema: 'MYLIB',
  table: 'MYTABLE',
})

const pks = await db.getPrimaryKeys({
  schema: 'MYLIB',
  table: 'MYTABLE',
})

const tableStream = db.getTablesAsStream({
  schema: 'MYLIB',
})
```

---

## License

MIT
