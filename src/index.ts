import * as core from '@actions/core';
import * as github from '@actions/github';
import { shouldAutoMerge, type Target } from './parse.js';

interface PullRequestGraphQL {
  id: string;
  mergeStateStatus:
    | 'BEHIND'
    | 'BLOCKED'
    | 'CLEAN'
    | 'DIRTY'
    | 'DRAFT'
    | 'HAS_HOOKS'
    | 'UNKNOWN'
    | 'UNSTABLE';
  commits: {
    nodes: Array<{
      commit: {
        statusCheckRollup: {
          state: 'ERROR' | 'EXPECTED' | 'FAILURE' | 'PENDING' | 'SUCCESS' | null;
        } | null;
      };
    }>;
  };
}

async function run(): Promise<void> {
  if (!['pull_request_target', 'pull_request'].includes(github.context.eventName)) {
    throw new Error('action triggered outside of a pull_request');
  }

  const sender = github.context.payload.sender?.login;

  if (!sender || !['dependabot[bot]', 'dependabot-preview[bot]'].includes(sender)) {
    core.info(
      `exiting early - expected PR by dependabot bot, found ${sender ?? 'no-sender'} instead`
    );
    return;
  }

  const token = core.getInput('github-token', { required: true });
  const target = (core.getInput('target') || 'patch') as Target;

  if (!['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor'].includes(target)) {
    throw new Error(`invalid target input: ${target}`);
  }

  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    throw new Error('missing pull_request payload');
  }

  if (
    !shouldAutoMerge({
      title: pullRequest.title,
      target
    })
  ) {
    core.info('manual merging required');
    return;
  }

  const octokit = github.getOctokit(token);

  const response = await octokit.graphql<{
    repository: { pullRequest: PullRequestGraphQL | null };
  }>(
    `query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          id
          mergeStateStatus
          commits(last: 1) {
            nodes {
              commit {
                statusCheckRollup {
                  state
                }
              }
            }
          }
        }
      }
    }`,
    {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      number: pullRequest.number
    }
  );

  const pr = response.repository.pullRequest;

  if (!pr) {
    throw new Error('pull request not found');
  }

  const latestCommit = pr.commits.nodes.at(-1)?.commit;
  const statusState = latestCommit?.statusCheckRollup?.state;
  const hasPendingChecks = statusState === 'PENDING' || statusState === 'EXPECTED';
  const canMergeWithoutWaiting = ['CLEAN', 'HAS_HOOKS', 'UNSTABLE'].includes(pr.mergeStateStatus);

  if (hasPendingChecks && canMergeWithoutWaiting) {
    throw new Error(
      'Repository rules are not enforcing status checks before merge. Configure branch protection so pending checks block direct merges and auto-merge can wait for CI.'
    );
  }

  await octokit.graphql(
    `mutation($pullRequestId: ID!) {
      enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: REBASE }) {
        clientMutationId
      }
    }`,
    {
      pullRequestId: pr.id
    }
  );

  core.info('auto-merge enabled');
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  core.setFailed(message);
});
