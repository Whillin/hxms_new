import { Injectable } from '@nestjs/common'

function parseBool(v: any, def = true): boolean {
  if (v === undefined || v === null || v === '') return def
  return /^(1|true|yes|on)$/i.test(String(v).trim())
}

@Injectable()
export class FeatureFlagsService {
  private readonly flags: Record<string, boolean> = {}

  constructor() {
    const raw = process.env.FEATURE_FLAGS || ''
    const names = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    for (const name of names) {
      const envKey = `FEATURE_ENABLE_${name}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
      this.flags[name] = parseBool(process.env[envKey], true)
    }
  }

  isEnabled(name: string, defaultValue = true): boolean {
    if (name in this.flags) return this.flags[name]
    const envKey = `FEATURE_ENABLE_${name}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    return parseBool(process.env[envKey], defaultValue)
  }

  getAll(): Record<string, boolean> {
    return { ...this.flags }
  }
}
