import axios from 'axios'
import type { Credentials, DisplayState, InputState, GroupState, TileReceiver } from '../store/heliosStore'

function createClient(ip: string, creds?: Credentials) {
  return axios.create({
    baseURL: `http://${ip}/api/v1/public`,
    timeout: 8000,
    headers: { 'Content-Type': 'application/json' },
    ...(creds ? { auth: { username: creds.username, password: creds.password } } : {})
  })
}

export interface FullState {
  display: DisplayState
  input: InputState
  receivers: TileReceiver[]
  groups: GroupState[]
  alertsCount: number
  sysAlerts: Record<string, { brief: string; severity: number; count: number }>
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' ? v : fallback
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}
function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

function parseState(data: unknown): FullState {
  const d = (data ?? {}) as Record<string, unknown>
  const dev = (d['dev'] ?? {}) as Record<string, unknown>
  const sys = (d['sys'] ?? {}) as Record<string, unknown>
  const display = (dev['display'] ?? {}) as Record<string, unknown>
  const ingest = (dev['ingest'] ?? {}) as Record<string, unknown>
  const tp = (ingest['testPattern'] ?? {}) as Record<string, unknown>
  const receiversRaw = (dev['receivers'] ?? {}) as Record<string, Record<string, unknown>>
  const groupsRaw = (dev['groups'] ?? {}) as Record<string, Record<string, unknown>>

  const receivers: TileReceiver[] = Object.entries(receiversRaw).map(([id, r]) => ({
    id,
    x: num(r['x'], 0),
    y: num(r['y'], 0),
    width: num(r['width'], 192),
    height: num(r['height'], 192),
    groupId: num(r['groupId'], -1),
    info: (r['info'] ?? {}) as TileReceiver['info']
  }))

  const groups: GroupState[] = Object.entries(groupsRaw).map(([, g]) => {
    const gains = (g['gains'] ?? {}) as Record<string, number>
    return {
      id: num(g['id'], 0),
      name: str(g['name'], ''),
      blackout: bool(g['blackout'], false),
      gains: {
        r: num(gains['r'], 1),
        g: num(gains['g'], 1),
        b: num(gains['b'], 1),
        i: num(gains['i'], 1)
      }
    }
  })

  const inputsRaw = (ingest['inputs'] ?? {}) as Record<string, Record<string, unknown>>
  const inputs: InputState['inputs'] = {}
  for (const [k, v] of Object.entries(inputsRaw)) {
    inputs[k] = {
      name: str(v['name'], k),
      valid: bool(v['valid'], false),
      resolution: typeof v['resolution'] === 'string' ? v['resolution'] : undefined
    }
  }

  return {
    display: {
      brightness: num(display['brightness'], 100),
      gamma: num(display['gamma'], 2.2),
      cct: num(display['cct'], 6500),
      blackout: bool(display['blackout'], false),
      freeze: bool(display['freeze'], false)
    },
    input: {
      input: str(ingest['input'], ''),
      inputs,
      testPattern: {
        enabled: bool(tp['enabled'], false),
        type: typeof tp['type'] === 'string' ? tp['type'] : undefined,
        motion: typeof tp['motion'] === 'boolean' ? tp['motion'] : undefined
      }
    },
    receivers,
    groups,
    alertsCount: num(sys['alertsCount'], 0),
    sysAlerts: (sys['alerts'] ?? {}) as FullState['sysAlerts']
  }
}

export async function getAll(ip: string, creds?: Credentials): Promise<FullState> {
  const { data } = await createClient(ip, creds).get<unknown>('/')
  return parseState(data)
}

export async function patchDisplay(
  ip: string,
  creds: Credentials | undefined,
  patch: Partial<DisplayState>
): Promise<void> {
  await createClient(ip, creds).patch('/', { dev: { display: patch } })
}

export async function patchInput(
  ip: string,
  creds: Credentials | undefined,
  patch: Partial<InputState>
): Promise<void> {
  const body: Record<string, unknown> = {}
  if (patch.input !== undefined) body['input'] = patch.input
  if (patch.testPattern !== undefined) body['testPattern'] = patch.testPattern
  await createClient(ip, creds).patch('/', { dev: { ingest: body } })
}

export async function patchGroup(
  ip: string,
  creds: Credentials | undefined,
  groupIndex: number,
  patch: Partial<Pick<GroupState, 'blackout' | 'gains'>>
): Promise<void> {
  await createClient(ip, creds).patch('/', { dev: { groups: { [groupIndex]: patch } } })
}
