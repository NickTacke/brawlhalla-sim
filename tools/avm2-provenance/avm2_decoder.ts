export type Instruction = {
  id: number
  name: string
  params: unknown[]
  types: string[]
}

export type LocatedInstruction = Instruction & {
  index: number
  pc: number
  endPc: number
}

const BRANCHES = new Set([
  'ifeq',
  'iffalse',
  'ifge',
  'ifgt',
  'ifle',
  'iflt',
  'ifne',
  'ifnge',
  'ifngt',
  'ifnle',
  'ifnlt',
  'ifstricteq',
  'ifstrictne',
  'iftrue',
  'jump',
])

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function readU30(code: Buffer, cursor: { offset: number }): number {
  let value = 0
  for (let byteIndex = 0; byteIndex < 5; byteIndex++) {
    assert(cursor.offset < code.length, 'truncated u30 operand')
    const byte = code[cursor.offset++]
    value |= (byte & 0x7f) << (byteIndex * 7)
    if ((byte & 0x80) === 0) return value >>> 0
  }
  return value >>> 0
}

function readS24(code: Buffer, cursor: { offset: number }): number {
  assert(cursor.offset + 3 <= code.length, 'truncated s24 operand')
  const value = code.readIntLE(cursor.offset, 3)
  cursor.offset += 3
  return value
}

function readOperand(type: string, code: Buffer, cursor: { offset: number }, prior: unknown[]): unknown {
  if (type === 'u8') {
    assert(cursor.offset < code.length, 'truncated u8 operand')
    return code[cursor.offset++]
  }
  if (type === 'offset' || type === 's24') return readS24(code, cursor)
  if (type.startsWith('array')) {
    const countValue = prior.at(-1)
    assert(typeof countValue === 'number', 'array operand count is not numeric')
    const count = countValue + (type.startsWith('array1-') ? 1 : 0)
    const itemType = type.slice(type.indexOf('-') + 1)
    return Array.from({ length: count }, () => readOperand(itemType, code, cursor, prior))
  }
  return readU30(code, cursor)
}

export function locateInstructions(codeBytes: Uint8Array, instructions: Instruction[]): LocatedInstruction[] {
  const code = Buffer.from(codeBytes)
  const cursor = { offset: 0 }
  const located = instructions.map((instruction, index) => {
    const pc = cursor.offset
    assert(cursor.offset < code.length, `missing opcode at PC ${pc}`)
    assert(code[cursor.offset++] === instruction.id, `opcode mismatch at PC ${pc}`)
    const values: unknown[] = []
    for (const type of instruction.types) values.push(readOperand(type, code, cursor, values))
    return { ...instruction, index, pc, endPc: cursor.offset }
  })
  assert(cursor.offset === code.length, `decode stopped at ${cursor.offset} of ${code.length}`)
  return located
}

export function validateBranches(instructions: LocatedInstruction[], codeLength: number): number[] {
  const boundaries = new Set(instructions.map((instruction) => instruction.pc))
  boundaries.add(codeLength)
  const invalidPcs: number[] = []

  for (const instruction of instructions) {
    if (BRANCHES.has(instruction.name)) {
      const offset = instruction.params[0]
      if (typeof offset !== 'number' || !boundaries.has(instruction.endPc + offset)) invalidPcs.push(instruction.pc)
    }
    if (instruction.name === 'lookupswitch') {
      const offsets = [instruction.params[0], ...(Array.isArray(instruction.params[2]) ? instruction.params[2] : [])]
      for (const entry of offsets) {
        const offset = Array.isArray(entry) ? entry[1] : entry
        if (typeof offset !== 'number' || !boundaries.has(instruction.pc + offset)) invalidPcs.push(instruction.pc)
      }
    }
  }

  return [...new Set(invalidPcs)].sort((left, right) => left - right)
}

export function multinameName(value: unknown, strings: string[]): string {
  if (!value || typeof value !== 'object' || !('data' in value)) return ''
  const name = (value as { data?: { name?: unknown } }).data?.name
  if (typeof name === 'number') return strings[name - 1] ?? ''
  return typeof name === 'string' ? name : ''
}

export function qnameKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('data' in value)) return null
  const candidate = value as { kind?: unknown; data?: { ns?: unknown; name?: unknown } }
  if (candidate.kind !== 7 || typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number') {
    return null
  }
  return `${candidate.data.ns}:${candidate.data.name}`
}

export function instructionName(instruction: Instruction, strings: string[]): string {
  if (instruction.name === 'pushstring') return String(instruction.params[0] ?? '')
  return multinameName(instruction.params[0], strings)
}

export function numericLiteral(instruction: Instruction): number | null {
  if (!['pushbyte', 'pushshort', 'pushint', 'pushuint', 'pushdouble'].includes(instruction.name)) return null
  const value = instruction.params[0]
  return typeof value === 'number' ? value : null
}

type StackEffect = { pops: number; pushes: number }

const VALUE_PRODUCERS = new Set([
  'findproperty',
  'findpropstrict',
  'getglobalscope',
  'getlex',
  'getlocal',
  'getlocal_0',
  'getlocal_1',
  'getlocal_2',
  'getlocal_3',
  'getscopeobject',
  'pushbyte',
  'pushdouble',
  'pushfalse',
  'pushint',
  'pushnan',
  'pushnull',
  'pushshort',
  'pushstring',
  'pushtrue',
  'pushuint',
  'pushundefined',
])
const UNARY_EXPRESSIONS = new Set([
  'astype',
  'bitnot',
  'coerce',
  'coerce_a',
  'coerce_b',
  'coerce_d',
  'coerce_i',
  'coerce_o',
  'coerce_s',
  'coerce_u',
  'convert_b',
  'convert_d',
  'convert_i',
  'convert_o',
  'convert_s',
  'convert_u',
  'decrement',
  'decrement_i',
  'esc_xattr',
  'esc_xelem',
  'increment',
  'increment_i',
  'negate',
  'negate_i',
  'not',
  'typeof',
])
const BINARY_EXPRESSIONS = new Set([
  'add',
  'add_i',
  'astypelate',
  'bitand',
  'bitor',
  'bitxor',
  'divide',
  'equals',
  'greaterequals',
  'greaterthan',
  'in',
  'instanceof',
  'istypelate',
  'lessequals',
  'lessthan',
  'lshift',
  'modulo',
  'multiply',
  'multiply_i',
  'rshift',
  'strictequals',
  'subtract',
  'subtract_i',
  'urshift',
])

function stackEffect(instruction: LocatedInstruction): StackEffect {
  if (VALUE_PRODUCERS.has(instruction.name)) return { pops: 0, pushes: 1 }
  if (UNARY_EXPRESSIONS.has(instruction.name)) return { pops: 1, pushes: 1 }
  if (BINARY_EXPRESSIONS.has(instruction.name)) return { pops: 2, pushes: 1 }
  if (['getproperty', 'getslot', 'getsuper', 'getdescendants'].includes(instruction.name)) {
    return { pops: 1, pushes: 1 }
  }
  if (instruction.name === 'newarray') return { pops: Number(instruction.params[0]), pushes: 1 }
  if (instruction.name === 'newobject') return { pops: Number(instruction.params[0]) * 2, pushes: 1 }
  if (['callproperty', 'callproplex', 'callsuper', 'constructprop'].includes(instruction.name)) {
    return { pops: Number(instruction.params[1]) + 1, pushes: 1 }
  }
  throw new Error(`unsupported expression opcode ${instruction.name} at PC ${instruction.pc}`)
}

function expressionBefore(
  instructions: LocatedInstruction[],
  instructionIndex: number,
): { startIndex: number; instructions: LocatedInstruction[] } {
  let needed = 1
  for (let index = instructionIndex - 1; index >= 0; index--) {
    const effect = stackEffect(instructions[index])
    needed -= effect.pushes
    assert(needed >= 0, `ambiguous expression boundary before PC ${instructions[instructionIndex].pc}`)
    needed += effect.pops
    if (needed === 0) return { startIndex: index, instructions: instructions.slice(index, instructionIndex) }
  }
  throw new Error(`incomplete expression before PC ${instructions[instructionIndex].pc}`)
}

export function callArgumentExpressions(instructions: LocatedInstruction[], callIndex: number): LocatedInstruction[][] {
  const call = instructions[callIndex]
  assert(['callproperty', 'callpropvoid'].includes(call.name), `PC ${call.pc} is not a property call`)
  const argumentCount = call.params[1]
  assert(typeof argumentCount === 'number', `call at PC ${call.pc} has a non-numeric argument count`)
  const expressions: LocatedInstruction[][] = []
  let cursor = callIndex
  for (let argumentIndex = argumentCount - 1; argumentIndex >= 0; argumentIndex--) {
    const expression = expressionBefore(instructions, cursor)
    expressions.unshift(expression.instructions)
    cursor = expression.startIndex
  }
  return expressions
}

export type IntegerExpressionValue =
  | { kind: 'constant'; value: number }
  | { kind: 'local'; index: number }
  | { kind: 'unknown' }

type EvaluationValue = IntegerExpressionValue | { kind: 'object'; name: string }

function localIndex(instruction: LocatedInstruction): number | null {
  if (instruction.name === 'getlocal') {
    const index = instruction.params[0]
    return typeof index === 'number' ? index : null
  }
  const match = /^getlocal_([0-3])$/.exec(instruction.name)
  return match ? Number(match[1]) : null
}

export function evaluateIntegerExpression(
  expression: LocatedInstruction[],
  strings: string[],
  knownProperties: Readonly<Record<string, number>> = {},
): IntegerExpressionValue {
  const stack: EvaluationValue[] = []
  const pop = (): EvaluationValue => stack.pop() ?? { kind: 'unknown' }

  for (const instruction of expression) {
    const literal = numericLiteral(instruction)
    if (literal !== null) {
      stack.push({ kind: 'constant', value: literal })
      continue
    }
    const local = localIndex(instruction)
    if (local !== null) {
      stack.push({ kind: 'local', index: local })
      continue
    }
    if (['getlex', 'findproperty', 'findpropstrict'].includes(instruction.name)) {
      stack.push({ kind: 'object', name: instructionName(instruction, strings) })
      continue
    }
    if (instruction.name === 'getproperty') {
      pop()
      const value = knownProperties[instructionName(instruction, strings)]
      stack.push(value === undefined ? { kind: 'unknown' } : { kind: 'constant', value })
      continue
    }
    if (UNARY_EXPRESSIONS.has(instruction.name)) {
      const value = pop()
      if (value.kind !== 'constant') {
        stack.push(value.kind === 'local' ? value : { kind: 'unknown' })
        continue
      }
      if (instruction.name === 'convert_u' || instruction.name === 'coerce_u') {
        stack.push({ kind: 'constant', value: value.value >>> 0 })
      } else if (instruction.name === 'convert_i' || instruction.name === 'coerce_i') {
        stack.push({ kind: 'constant', value: value.value | 0 })
      } else if (instruction.name === 'bitnot') {
        stack.push({ kind: 'constant', value: ~value.value })
      } else {
        stack.push(value)
      }
      continue
    }
    if (BINARY_EXPRESSIONS.has(instruction.name)) {
      const right = pop()
      const left = pop()
      if (left.kind !== 'constant' || right.kind !== 'constant') {
        stack.push({ kind: 'unknown' })
        continue
      }
      const operations: Partial<Record<string, (left: number, right: number) => number>> = {
        bitand: (left, right) => left & right,
        bitor: (left, right) => left | right,
        bitxor: (left, right) => left ^ right,
        lshift: (left, right) => left << right,
        rshift: (left, right) => left >> right,
        urshift: (left, right) => left >>> right,
      }
      const operation = operations[instruction.name]
      stack.push(operation ? { kind: 'constant', value: operation(left.value, right.value) } : { kind: 'unknown' })
      continue
    }
    stack.push({ kind: 'unknown' })
  }

  return stack.length === 1 && stack[0].kind !== 'object' ? stack[0] : { kind: 'unknown' }
}
