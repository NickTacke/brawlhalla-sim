import { describe, expect, test } from 'bun:test'

import {
  type ContractBundle,
  FAMILY_IDS,
  type FamilyContract,
  type MutationClass,
  ORACLE_PROTOCOL,
  type OracleCase,
  TARGET_BUILD,
  canonicalJson,
  oracleCaseLeaf,
  oracleSuiteRoot,
  requiredMutationIdsForFamily,
  sha256Canonical,
  validateContractBundle,
} from '../patch_loader_oracle_contract.js'

function buildFamily(familyId: (typeof FAMILY_IDS)[number]): FamilyContract {
  return {
    familyId,
    closureStatus: 'complete',
    schemaSha256: sha256Canonical({ familyId, kind: 'synthetic-schema' }),
    reviewerApprovalSha256: sha256Canonical({ familyId, kind: 'synthetic-review' }),
    requiredMutationIds: requiredMutationIdsForFamily(familyId),
  }
}

function buildCase(familyId: (typeof FAMILY_IDS)[number], mutationId: string): OracleCase {
  const failure = {
    status: 'loader-failure' as const,
    code: 'PARSER_REJECTED' as const,
    phase: 'SYNTHETIC_CONTRACT',
    originalMethodId: '0',
    originalBytePc: '0',
  }
  const value: Omit<OracleCase, 'leafSha256'> = {
    familyId,
    mutationClass: mutationId.slice(0, mutationId.indexOf('/')) as MutationClass,
    mutationId,
    outcome: { ...failure, failureSha256: sha256Canonical(failure) },
  }
  return { ...value, leafSha256: oracleCaseLeaf(value) }
}

function buildBundle(): ContractBundle {
  const families = FAMILY_IDS.map(buildFamily)
  const cases = families.flatMap((family) =>
    family.requiredMutationIds.map((mutationId) => buildCase(family.familyId, mutationId)),
  )
  return {
    protocol: ORACLE_PROTOCOL,
    evidenceStatus: 'contract-only',
    build: TARGET_BUILD,
    privacyProfile: 'synthetic-derived/v1',
    familyRegistrySha256: sha256Canonical(families),
    families,
    cases,
    suiteRootSha256: oracleSuiteRoot(cases.map((entry) => entry.leafSha256)),
  }
}

function refreshCaseAndSuite(bundle: ContractBundle, index: number): void {
  const changedCase = bundle.cases[index]
  const value: Omit<OracleCase, 'leafSha256'> = {
    familyId: changedCase.familyId,
    mutationClass: changedCase.mutationClass,
    mutationId: changedCase.mutationId,
    outcome: changedCase.outcome,
  }
  changedCase.leafSha256 = oracleCaseLeaf(value)
  bundle.suiteRootSha256 = oracleSuiteRoot(bundle.cases.map((entry) => entry.leafSha256))
}

describe('patch-loader oracle contract validator', () => {
  test('accepts a complete contract-only failure specimen without claiming ticket acceptance', () => {
    const result = validateContractBundle(buildBundle())

    expect(result).toEqual({ valid: true, acceptanceSatisfied: false, errors: [] })
  })

  test('rejects incomplete mutation execution', () => {
    const bundle = buildBundle()
    bundle.cases.pop()
    bundle.suiteRootSha256 = oracleSuiteRoot(bundle.cases.map((entry) => entry.leafSha256))

    const result = validateContractBundle(bundle)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('required cases'))).toBe(true)
  })

  test('rejects mutation ledgers weaker than the pinned v1 matrix', () => {
    const bundle = buildBundle()
    bundle.families[0].requiredMutationIds.pop()
    bundle.familyRegistrySha256 = sha256Canonical(bundle.families)

    const result = validateContractBundle(bundle)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('pinned v1'))).toBe(true)
  })

  test('does not count infrastructure failures as loader outcomes', () => {
    const bundle = buildBundle()
    bundle.cases[0].outcome = { status: 'infrastructure-failure', code: 'ORACLE_INTERNAL_FAULT' } as never
    refreshCaseAndSuite(bundle, 0)

    const result = validateContractBundle(bundle)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('infrastructure failures never satisfy'))).toBe(true)
  })

  test('rejects success bytes until an external PLOB privacy verifier exists', () => {
    const bundle = buildBundle()
    bundle.cases[0].outcome = {
      status: 'success',
      canonicalObjectEncoding: 'plob/v1',
      canonicalObjectBase64: `base64:${btoa('https://private.invalid/source')}`,
      canonicalObjectSha256: sha256Canonical('untrusted'),
    }
    refreshCaseAndSuite(bundle, 0)

    const result = validateContractBundle(bundle)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('external plob/v1'))).toBe(true)
  })

  test('rejects N/A without externally authenticated reviewer evidence', () => {
    const bundle = buildBundle()
    bundle.cases[0].outcome = {
      status: 'not-applicable',
      reasonCode: '',
      reviewerEvidenceSha256: sha256Canonical('untrusted'),
    }
    refreshCaseAndSuite(bundle, 0)

    const result = validateContractBundle(bundle)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('externally authenticated reviewer evidence'))).toBe(true)
  })

  test('rejects privacy-disallowed metadata', () => {
    const bundle = buildBundle() as unknown as Record<string, unknown>
    bundle.privacyProfile = 'https://private.invalid/fixture'

    const result = validateContractBundle(bundle)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('privacy-disallowed string'))).toBe(true)
  })

  test('rejects reordered cases even when their suite digest is recomputed', () => {
    const bundle = buildBundle()
    ;[bundle.cases[0], bundle.cases[1]] = [bundle.cases[1], bundle.cases[0]]
    bundle.suiteRootSha256 = oracleSuiteRoot(bundle.cases.map((entry) => entry.leafSha256))

    const result = validateContractBundle(bundle)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('registry order'))).toBe(true)
  })

  test('canonical JSON sorts UTF-8 keys and rejects numeric tokens', () => {
    expect(canonicalJson({ z: 'last', a: ['first'] })).toBe('{"a":["first"],"z":"last"}\n')
    expect(() => canonicalJson({ forbidden: 1 })).toThrow('canonical JSON forbids number values')
  })
})
