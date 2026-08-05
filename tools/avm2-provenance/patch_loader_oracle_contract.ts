import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const ORACLE_PROTOCOL = 'patch-loader-oracle/v1'
export const CONTRACT_ONLY_STATUS = 'contract-only'
export const TARGET_BUILD = '10.09.96325'

export const FAMILY_IDS = [
  'dodge',
  'game-mode',
  'hero',
  'hurtbox',
  'item-spawn-rate',
  'item-spawn-rules',
  'item',
  'level-set',
  'level-geometry',
  'power-swap',
  'power',
  'rune',
  'scoring',
  'stat-ladder',
] as const

export const MUTATION_CLASSES = ['missing', 'empty', 'malformed', 'duplicate', 'parent', 'source-order'] as const

const LOADER_FAILURE_CODES = new Set([
  'PARSER_REJECTED',
  'LOADER_EXCEPTION',
  'POST_LOAD_EXCEPTION',
  'UNRESOLVED_REFERENCE',
])
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/
const COMMON_MUTATION_IDS = [
  'missing/optional-field/v1',
  'missing/required-field/v1',
  'missing/identifying-field/v1',
  'missing/record/v1',
  'empty/field/v1',
  'empty/identifier/v1',
  'empty/explicit-default/v1',
  'malformed/numeric/v1',
  'malformed/boolean/v1',
  'malformed/unknown-field/v1',
  'malformed/structure/v1',
  'duplicate/id-adjacent/v1',
  'duplicate/id-separated/v1',
  'duplicate/name-adjacent/v1',
  'duplicate/name-separated/v1',
  'duplicate/logical-index/v1',
  'parent/missing/v1',
  'parent/backward/v1',
  'parent/forward/v1',
  'parent/multilevel/v1',
  'parent/self/v1',
  'parent/two-node-cycle/v1',
  'parent/after-reorder/v1',
  'source-order/swap-adjacent/v1',
  'source-order/reverse-minimal/v1',
  'source-order/swap-parent-child/v1',
  'source-order/duplicate-winner/v1',
  'source-order/field-order/v1',
] as const
const XML_MUTATION_IDS = [
  'empty/xml-self-closing/v1',
  'empty/xml-open-close/v1',
  'empty/xml-attribute/v1',
  'malformed/xml-duplicate-attribute/v1',
  'malformed/xml-missing-equals/v1',
  'malformed/xml-non-double-quote/v1',
  'malformed/xml-mismatched-close/v1',
  'malformed/xml-unexpected-eof/v1',
  'source-order/xml-child-elements/v1',
] as const
const DELIMITED_MUTATION_IDS = [
  'missing/delimited-short-row/v1',
  'missing/delimited-required-header/v1',
  'empty/delimited-unquoted-cell/v1',
  'empty/delimited-quoted-cell/v1',
  'empty/delimited-final-cell/v1',
  'empty/delimited-blank-row/v1',
  'malformed/delimited-unmatched-quote/v1',
  'malformed/delimited-escaped-quote/v1',
  'malformed/delimited-embedded-comma/v1',
  'malformed/delimited-crlf/v1',
  'malformed/delimited-lf/v1',
  'malformed/delimited-extra-row/v1',
  'malformed/delimited-short-row/v1',
  'malformed/delimited-duplicate-header/v1',
  'source-order/delimited-swap-rows/v1',
  'source-order/delimited-columns-with-header/v1',
  'source-order/delimited-header-only/v1',
  'source-order/delimited-line-ending/v1',
] as const
const PRIVATE_STRING_PATTERNS = [
  /\/(?:Users|home)\//,
  /[A-Za-z]:\\/,
  /file:\/\//i,
  /https?:\/\//i,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
]
const PROHIBITED_KEYS = new Set([
  'accountId',
  'filename',
  'localPath',
  'playerName',
  'rawException',
  'rawLog',
  'secret',
  'sourceText',
])
export type FamilyId = (typeof FAMILY_IDS)[number]
export type MutationClass = (typeof MUTATION_CLASSES)[number]
type SourceForm = 'xml' | 'delimited' | 'unresolved-level'

const FAMILY_SOURCE_FORM: Record<FamilyId, SourceForm> = {
  dodge: 'xml',
  'game-mode': 'xml',
  hero: 'xml',
  hurtbox: 'delimited',
  'item-spawn-rate': 'xml',
  'item-spawn-rules': 'xml',
  item: 'delimited',
  'level-set': 'xml',
  'level-geometry': 'unresolved-level',
  'power-swap': 'xml',
  power: 'delimited',
  rune: 'xml',
  scoring: 'xml',
  'stat-ladder': 'xml',
}

export type FamilyContract = {
  familyId: FamilyId
  closureStatus: 'complete'
  schemaSha256: string
  reviewerApprovalSha256: string
  requiredMutationIds: string[]
}

export type SuccessOutcome = {
  status: 'success'
  canonicalObjectEncoding: 'plob/v1'
  canonicalObjectBase64: string
  canonicalObjectSha256: string
}

export type LoaderFailureOutcome = {
  status: 'loader-failure'
  code: 'PARSER_REJECTED' | 'LOADER_EXCEPTION' | 'POST_LOAD_EXCEPTION' | 'UNRESOLVED_REFERENCE'
  phase: string
  originalMethodId: string
  originalBytePc: string
  failureSha256: string
}

export type NotApplicableOutcome = {
  status: 'not-applicable'
  reasonCode: string
  reviewerEvidenceSha256: string
}

export type OracleCase = {
  familyId: FamilyId
  mutationClass: MutationClass
  mutationId: string
  outcome: SuccessOutcome | LoaderFailureOutcome | NotApplicableOutcome
  leafSha256: string
}

export type ContractBundle = {
  protocol: typeof ORACLE_PROTOCOL
  evidenceStatus: typeof CONTRACT_ONLY_STATUS
  build: typeof TARGET_BUILD
  privacyProfile: 'synthetic-derived/v1'
  familyRegistrySha256: string
  families: FamilyContract[]
  cases: OracleCase[]
  suiteRootSha256: string
}

export type ContractValidation = {
  valid: boolean
  acceptanceSatisfied: false
  errors: string[]
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareUtf8(left: string, right: string): number {
  const encoder = new TextEncoder()
  const leftBytes = encoder.encode(left)
  const rightBytes = encoder.encode(right)
  const sharedLength = Math.min(leftBytes.length, rightBytes.length)
  for (let index = 0; index < sharedLength; index++) {
    const difference = leftBytes[index] - rightBytes[index]
    if (difference !== 0) return difference
  }
  return leftBytes.length - rightBytes.length
}

export function requiredMutationIdsForFamily(familyId: FamilyId): string[] {
  let sourceSpecific: readonly string[] = []
  if (FAMILY_SOURCE_FORM[familyId] === 'xml') sourceSpecific = XML_MUTATION_IDS
  if (FAMILY_SOURCE_FORM[familyId] === 'delimited') sourceSpecific = DELIMITED_MUTATION_IDS
  return [...COMMON_MUTATION_IDS, ...sourceSpecific].sort(compareUtf8)
}

function canonicalValue(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(',')}]`
  if (isRecord(value)) {
    const keys = Object.keys(value).sort(compareUtf8)
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalValue(value[key])}`).join(',')}}`
  }
  throw new TypeError(`canonical JSON forbids ${typeof value} values`)
}

export function canonicalJson(value: unknown): string {
  return `${canonicalValue(value)}\n`
}

export function sha256Bytes(bytes: string | ArrayBufferView<ArrayBufferLike>): string {
  if (typeof bytes === 'string') return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
  const ownedBytes = new Uint8Array(bytes.byteLength)
  ownedBytes.set(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength))
  return `sha256:${createHash('sha256').update(ownedBytes).digest('hex')}`
}

export function sha256Canonical(value: unknown): string {
  return sha256Bytes(canonicalJson(value))
}

function domainDigest(domain: string, value: unknown): string {
  const digest = createHash('sha256').update(`${domain}\0`, 'utf8').update(canonicalJson(value), 'utf8').digest('hex')
  return `sha256:${digest}`
}

export function oracleCaseLeaf(value: Omit<OracleCase, 'leafSha256'>): string {
  return domainDigest('brawlhalla-sim/patch-loader-contract-case/v1', value)
}

export function oracleSuiteRoot(leaves: string[]): string {
  return domainDigest('brawlhalla-sim/patch-loader-contract-suite/v1', leaves)
}

function stringField(record: JsonRecord, key: string, context: string, errors: string[]): string | undefined {
  const value = record[key]
  if (typeof value !== 'string') {
    errors.push(`${context}.${key} must be a string`)
    return undefined
  }
  return value
}

function requireHash(value: string | undefined, context: string, errors: string[]): void {
  if (value !== undefined && !HASH_PATTERN.test(value)) errors.push(`${context} must be a lowercase SHA-256 identifier`)
}

function withoutKey(record: JsonRecord, omittedKey: string): JsonRecord {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== omittedKey))
}

function scanPrivacy(value: unknown, context: string, errors: string[]): void {
  if (typeof value === 'string') {
    if (PRIVATE_STRING_PATTERNS.some((pattern) => pattern.test(value))) {
      errors.push(`${context} contains a privacy-disallowed string`)
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanPrivacy(entry, `${context}[${index}]`, errors))
    return
  }
  if (!isRecord(value)) return
  for (const [key, entry] of Object.entries(value)) {
    if (PROHIBITED_KEYS.has(key)) errors.push(`${context}.${key} is prohibited by the privacy profile`)
    scanPrivacy(entry, `${context}.${key}`, errors)
  }
}

function validateFamilies(value: unknown, errors: string[]): FamilyContract[] {
  if (!Array.isArray(value)) {
    errors.push('bundle.families must be an array')
    return []
  }
  if (value.length !== FAMILY_IDS.length) errors.push(`bundle.families must contain ${FAMILY_IDS.length} families`)

  const families: FamilyContract[] = []
  for (let index = 0; index < value.length; index++) {
    const context = `bundle.families[${index}]`
    const candidate = value[index]
    if (!isRecord(candidate)) {
      errors.push(`${context} must be an object`)
      continue
    }
    const familyId = stringField(candidate, 'familyId', context, errors)
    if (familyId !== FAMILY_IDS[index]) errors.push(`${context}.familyId must be ${FAMILY_IDS[index] ?? '<none>'}`)
    if (candidate.closureStatus !== 'complete') errors.push(`${context}.closureStatus must be complete`)
    requireHash(stringField(candidate, 'schemaSha256', context, errors), `${context}.schemaSha256`, errors)
    requireHash(
      stringField(candidate, 'reviewerApprovalSha256', context, errors),
      `${context}.reviewerApprovalSha256`,
      errors,
    )

    const requiredMutationIds = candidate.requiredMutationIds
    if (!Array.isArray(requiredMutationIds) || requiredMutationIds.some((entry) => typeof entry !== 'string')) {
      errors.push(`${context}.requiredMutationIds must be a string array`)
      continue
    }
    const ids = requiredMutationIds as string[]
    if (FAMILY_IDS.includes(familyId as FamilyId)) {
      const expectedIds = requiredMutationIdsForFamily(familyId as FamilyId)
      if (
        ids.length !== expectedIds.length ||
        ids.some((entry, mutationIndex) => entry !== expectedIds[mutationIndex])
      ) {
        errors.push(
          `${context}.requiredMutationIds must match the pinned v1 ${FAMILY_SOURCE_FORM[familyId as FamilyId]} ledger`,
        )
      }
      families.push(candidate as FamilyContract)
    }
  }
  return families
}

function validateOutcome(value: unknown, context: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${context} must be an object`)
    return
  }
  const status = stringField(value, 'status', context, errors)
  if (status === 'success') {
    errors.push(`${context} success outcomes require an external plob/v1 schema and privacy verifier`)
    return
  }
  if (status === 'loader-failure') {
    const code = stringField(value, 'code', context, errors)
    if (code !== undefined && !LOADER_FAILURE_CODES.has(code))
      errors.push(`${context}.code is not a loader-semantic failure`)
    stringField(value, 'phase', context, errors)
    stringField(value, 'originalMethodId', context, errors)
    stringField(value, 'originalBytePc', context, errors)
    const failureSha256 = stringField(value, 'failureSha256', context, errors)
    requireHash(failureSha256, `${context}.failureSha256`, errors)
    if (failureSha256 !== undefined) {
      const failure = withoutKey(value, 'failureSha256')
      if (failureSha256 !== sha256Canonical(failure))
        errors.push(`${context}.failureSha256 does not match the failure fields`)
    }
    return
  }
  if (status === 'not-applicable') {
    errors.push(`${context} N/A outcomes require externally authenticated reviewer evidence`)
    return
  }
  if (status === 'infrastructure-failure') {
    errors.push(`${context} infrastructure failures never satisfy mutation coverage`)
    return
  }
  if (status !== undefined) errors.push(`${context}.status is not an allowed contract outcome`)
}

function validateCases(value: unknown, families: FamilyContract[], errors: string[]): OracleCase[] {
  if (!Array.isArray(value)) {
    errors.push('bundle.cases must be an array')
    return []
  }

  const expected = families.flatMap((family) =>
    family.requiredMutationIds.map((mutationId) => ({ familyId: family.familyId, mutationId })),
  )
  if (value.length !== expected.length)
    errors.push(`bundle.cases must contain exactly ${expected.length} required cases`)

  const cases: OracleCase[] = []
  for (let index = 0; index < value.length; index++) {
    const context = `bundle.cases[${index}]`
    const candidate = value[index]
    if (!isRecord(candidate)) {
      errors.push(`${context} must be an object`)
      continue
    }
    const familyId = stringField(candidate, 'familyId', context, errors)
    const mutationClass = stringField(candidate, 'mutationClass', context, errors)
    const mutationId = stringField(candidate, 'mutationId', context, errors)
    const expectedCase = expected[index]
    if (familyId !== expectedCase?.familyId || mutationId !== expectedCase?.mutationId) {
      errors.push(`${context} is missing or out of registry order`)
    }
    if (!MUTATION_CLASSES.includes(mutationClass as MutationClass)) {
      errors.push(`${context}.mutationClass is unknown`)
    } else if (mutationId !== undefined && !mutationId.startsWith(`${mutationClass}/`)) {
      errors.push(`${context}.mutationId does not match its mutation class`)
    }
    validateOutcome(candidate.outcome, `${context}.outcome`, errors)
    const leafSha256 = stringField(candidate, 'leafSha256', context, errors)
    requireHash(leafSha256, `${context}.leafSha256`, errors)
    if (leafSha256 !== undefined) {
      const leafValue = withoutKey(candidate, 'leafSha256')
      if (leafSha256 !== oracleCaseLeaf(leafValue as Omit<OracleCase, 'leafSha256'>)) {
        errors.push(`${context}.leafSha256 does not match the case`)
      }
    }
    if (
      FAMILY_IDS.includes(familyId as FamilyId) &&
      MUTATION_CLASSES.includes(mutationClass as MutationClass) &&
      mutationId !== undefined &&
      leafSha256 !== undefined
    ) {
      cases.push(candidate as OracleCase)
    }
  }
  return cases
}

export function validateContractBundle(value: unknown): ContractValidation {
  const errors: string[] = []
  if (!isRecord(value)) return { valid: false, acceptanceSatisfied: false, errors: ['bundle must be an object'] }

  if (value.protocol !== ORACLE_PROTOCOL) errors.push(`bundle.protocol must be ${ORACLE_PROTOCOL}`)
  if (value.evidenceStatus !== CONTRACT_ONLY_STATUS) {
    errors.push('bundle.evidenceStatus must be contract-only; this validator cannot attest reference execution')
  }
  if (value.build !== TARGET_BUILD) errors.push(`bundle.build must be ${TARGET_BUILD}`)
  if (value.privacyProfile !== 'synthetic-derived/v1') {
    errors.push('bundle.privacyProfile must be synthetic-derived/v1')
  }

  const families = validateFamilies(value.families, errors)
  const familyRegistrySha256 = stringField(value, 'familyRegistrySha256', 'bundle', errors)
  requireHash(familyRegistrySha256, 'bundle.familyRegistrySha256', errors)
  if (familyRegistrySha256 !== undefined && familyRegistrySha256 !== sha256Canonical(value.families)) {
    errors.push('bundle.familyRegistrySha256 does not match bundle.families')
  }

  const cases = validateCases(value.cases, families, errors)
  const suiteRootSha256 = stringField(value, 'suiteRootSha256', 'bundle', errors)
  requireHash(suiteRootSha256, 'bundle.suiteRootSha256', errors)
  if (suiteRootSha256 !== undefined && suiteRootSha256 !== oracleSuiteRoot(cases.map((entry) => entry.leafSha256))) {
    errors.push('bundle.suiteRootSha256 does not match the ordered case leaves')
  }

  scanPrivacy(value, 'bundle', errors)
  return { valid: errors.length === 0, acceptanceSatisfied: false, errors }
}

if (import.meta.main) {
  const inputPath = process.argv[2]
  if (!inputPath) {
    process.stderr.write('usage: bun patch_loader_oracle_contract.ts <contract-bundle.json>\n')
    process.exit(2)
  }
  try {
    const bundle = JSON.parse(readFileSync(resolve(inputPath), 'utf8')) as unknown
    const result = validateContractBundle(bundle)
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    process.exit(result.valid ? 0 : 1)
  } catch {
    process.stderr.write('contract bundle could not be read or parsed\n')
    process.exit(1)
  }
}
