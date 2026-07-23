import type { IType } from '~/types/process'

function normalize(value: string): string {
  return value.trim().toUpperCase()
}

export function resolveTypeCodeFromVin(vin: string, types: IType[]): string | null {
  const normalizedVin = normalize(vin)
  if (!normalizedVin) return null

  for (const type of types) {
    const name = normalize(type.name)
    const code = normalize(type.typeCode)
    if (normalizedVin.includes(name) || normalizedVin.includes(code)) {
      return type.typeCode
    }
  }

  if (normalizedVin.includes('CSU')) {
    const match = types.find(type =>
      normalize(type.name) === 'CSUV' || normalize(type.typeCode) === 'AA'
    )
    if (match) return match.typeCode
  }

  if (normalizedVin.includes('T10')) {
    const match = types.find(type =>
      normalize(type.name) === 'T10F' || normalize(type.typeCode) === 'BB'
    )
    if (match) return match.typeCode
  }

  return types[0]?.typeCode ?? null
}

export function isValidProductVin(vin: string): boolean {
  return vin.trim().length >= 6
}
