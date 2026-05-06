declare module 'JSONStream' {
  import { Transform } from 'stream'

  type PathPattern = string | boolean | RegExp | null
  type Pattern = PathPattern | PathPattern[]

  function parse(pattern: Pattern): Transform
  function stringify(open?: string, sep?: string, close?: string): Transform

  export { parse, stringify }
  export default { parse, stringify }
}
