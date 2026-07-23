import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const DATA_DIR = join(homedir(), '.token-wuer');
const PROJECTS_FILE = join(DATA_DIR, 'projects.json');

export interface SubagentRecord {
  name: string;
  waterMl: number;
  tokens: number;
}

export interface SessionRecord {
  id: string;
  startedAt: string;
  updatedAt: string;
  waterMl: number;
  tokens: number;
  subagents: SubagentRecord[];
}

export interface ProjectData {
  path: string;
  name: string;
  platform: string;
  sessions: SessionRecord[];
  totals: {
    waterMl: number;
    tokens: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProjectsStore {
  projects: Record<string, ProjectData>;
}

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function read(): ProjectsStore {
  ensureDir();
  try {
    const raw = readFileSync(PROJECTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { projects: {} };
  }
}

function write(store: ProjectsStore): void {
  ensureDir();
  writeFileSync(PROJECTS_FILE, JSON.stringify(store, null, 2));
}

function makeSession(): SessionRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    startedAt: now,
    updatedAt: now,
    waterMl: 0,
    tokens: 0,
    subagents: [],
  };
}

export function getProject(projectPath: string): ProjectData | undefined {
  return read().projects[projectPath];
}

export function getOrCreateProject(projectPath: string, platform: string): ProjectData {
  const store = read();
  if (store.projects[projectPath]) return store.projects[projectPath];

  const now = new Date().toISOString();
  const name = projectPath.split('/').pop() || projectPath;
  const project: ProjectData = {
    path: projectPath,
    name,
    platform,
    sessions: [],
    totals: { waterMl: 0, tokens: 0 },
    createdAt: now,
    updatedAt: now,
  };
  store.projects[projectPath] = project;
  write(store);
  return project;
}

export function addSessionTokens(
  projectPath: string,
  platform: string,
  tokens: number,
  subagentStack: string[],
): { session: SessionRecord; project: ProjectData } {
  const store = read();
  let project = store.projects[projectPath];
  if (!project) {
    project = {
      path: projectPath,
      name: projectPath.split('/').pop() || projectPath,
      platform,
      sessions: [],
      totals: { waterMl: 0, tokens: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const waterMl = tokens * 0.003;

  let session = project.sessions[project.sessions.length - 1];
  if (!session) {
    session = makeSession();
    project.sessions.push(session);
  }

  if (subagentStack.length > 0) {
    const subName = subagentStack[subagentStack.length - 1];
    let sub = session.subagents.find(s => s.name === subName);
    if (!sub) {
      sub = { name: subName, waterMl: 0, tokens: 0 };
      session.subagents.push(sub);
    }
    sub.waterMl += waterMl;
    sub.tokens += tokens;
  }

  session.waterMl += waterMl;
  session.tokens += tokens;
  session.updatedAt = new Date().toISOString();

  project.totals.waterMl += waterMl;
  project.totals.tokens += tokens;
  project.updatedAt = new Date().toISOString();

  store.projects[projectPath] = project;
  write(store);

  return { session, project };
}

export function getAllProjects(): ProjectData[] {
  const store = read();
  return Object.values(store.projects).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getProjectSummary(projectPath: string) {
  const project = getProject(projectPath);
  if (!project) return null;

  const sessionSummaries = project.sessions.map(s => ({
    id: s.id,
    waterMl: Math.round(s.waterMl * 100) / 100,
    tokens: s.tokens,
    subagents: s.subagents.map(sub => ({
      name: sub.name,
      waterMl: Math.round(sub.waterMl * 100) / 100,
      tokens: sub.tokens,
    })),
    startedAt: s.startedAt,
  }));

  return {
    project: project.name,
    platform: project.platform,
    path: project.path,
    totals: {
      waterMl: Math.round(project.totals.waterMl * 100) / 100,
      tokens: project.totals.tokens,
      liters: Math.round(project.totals.waterMl / 10) / 100,
    },
    sessions: sessionSummaries,
    sessionCount: project.sessions.length,
  };
}
