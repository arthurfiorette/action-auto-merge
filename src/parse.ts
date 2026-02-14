import semver from 'semver';

const regex = {
  semver:
    /(?<version>(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)/,
  name: /(bump|update) (?<name>(?:@[^\s]+\/)?[^\s]+) (requirement)?/i
} as const;

const weight: Record<string, number> = {
  premajor: 6,
  major: 5,
  preminor: 4,
  minor: 3,
  prepatch: 2,
  prerelease: 2,
  patch: 1
};

export type Target = 'patch' | 'minor' | 'major' | 'prepatch' | 'preminor' | 'premajor';

export interface ParseInput {
  title: string;
  target: Target;
}

export function shouldAutoMerge({ title, target }: ParseInput): boolean {
  const depName = title.match(regex.name)?.groups?.name;

  if (!depName) {
    return false;
  }

  const from = title.match(new RegExp(`from \\D*${regex.semver.source}`))?.groups;
  const to = title.match(new RegExp(`to \\D*${regex.semver.source}`))?.groups;

  if (!to?.version || !semver.valid(to.version)) {
    return false;
  }

  if (!from?.version || !semver.valid(from.version)) {
    return false;
  }

  const versionChange = semver.diff(from.version, to.version);

  if (!versionChange) {
    return false;
  }

  return (weight[target] ?? 0) >= (weight[versionChange] ?? 0);
}
