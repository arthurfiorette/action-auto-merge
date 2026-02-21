"use strict";
var __webpack_require__ = {};
(()=>{
    __webpack_require__.n = (module)=>{
        var getter = module && module.__esModule ? ()=>module['default'] : ()=>module;
        __webpack_require__.d(getter, {
            a: getter
        });
        return getter;
    };
})();
(()=>{
    __webpack_require__.d = (exports1, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key)) Object.defineProperty(exports1, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
var __webpack_exports__ = {};
const core_namespaceObject = require("@actions/core");
const github_namespaceObject = require("@actions/github");
const external_semver_namespaceObject = require("semver");
var external_semver_default = /*#__PURE__*/ __webpack_require__.n(external_semver_namespaceObject);
const regex = {
    semver: /(?<version>(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)/,
    name: /(bump|update) (?<name>(?:@[^\s]+\/)?[^\s]+) (requirement)?/i
};
const weight = {
    premajor: 6,
    major: 5,
    preminor: 4,
    minor: 3,
    prepatch: 2,
    prerelease: 2,
    patch: 1
};
function shouldAutoMerge({ title, target }) {
    const depName = title.match(regex.name)?.groups?.name;
    if (!depName) return false;
    const from = title.match(new RegExp(`from \\D*${regex.semver.source}`))?.groups;
    const to = title.match(new RegExp(`to \\D*${regex.semver.source}`))?.groups;
    if (!to?.version || !external_semver_default().valid(to.version)) return false;
    if (!from?.version || !external_semver_default().valid(from.version)) return false;
    const versionChange = external_semver_default().diff(from.version, to.version);
    if (!versionChange) return false;
    return (weight[target] ?? 0) >= (weight[versionChange] ?? 0);
}
async function run() {
    if (![
        'pull_request_target',
        'pull_request'
    ].includes(github_namespaceObject.context.eventName)) throw new Error('action triggered outside of a pull_request');
    const sender = github_namespaceObject.context.payload.sender?.login;
    if (!sender || ![
        'dependabot[bot]',
        'dependabot-preview[bot]'
    ].includes(sender)) return void core_namespaceObject.info(`exiting early - expected PR by dependabot bot, found ${sender ?? 'no-sender'} instead`);
    const token = core_namespaceObject.getInput('github-token', {
        required: true
    });
    const target = core_namespaceObject.getInput('target') || 'patch';
    if (![
        'patch',
        'minor',
        'major',
        'prepatch',
        'preminor',
        'premajor'
    ].includes(target)) throw new Error(`invalid target input: ${target}`);
    const pullRequest = github_namespaceObject.context.payload.pull_request;
    if (!pullRequest) throw new Error('missing pull_request payload');
    if (!shouldAutoMerge({
        title: pullRequest.title,
        target
    })) return void core_namespaceObject.info('manual merging required');
    const octokit = github_namespaceObject.getOctokit(token);
    const response = await octokit.graphql(`query($owner: String!, $repo: String!, $number: Int!) {
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
    }`, {
        owner: github_namespaceObject.context.repo.owner,
        repo: github_namespaceObject.context.repo.repo,
        number: pullRequest.number
    });
    const pr = response.repository.pullRequest;
    if (!pr) throw new Error('pull request not found');
    const latestCommit = pr.commits.nodes.at(-1)?.commit;
    const statusState = latestCommit?.statusCheckRollup?.state;
    const hasPendingChecks = 'PENDING' === statusState || 'EXPECTED' === statusState;
    const canMergeWithoutWaiting = [
        'CLEAN',
        'HAS_HOOKS',
        'UNSTABLE'
    ].includes(pr.mergeStateStatus);
    if (hasPendingChecks && canMergeWithoutWaiting) throw new Error('Repository rules are not enforcing status checks before merge. Configure branch protection so pending checks block direct merges and auto-merge can wait for CI.');
    await octokit.graphql(`mutation($pullRequestId: ID!) {
      enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: REBASE }) {
        clientMutationId
      }
    }`, {
        pullRequestId: pr.id
    });
    core_namespaceObject.info('auto-merge enabled');
}
run().catch((error)=>{
    const message = error instanceof Error ? error.message : String(error);
    core_namespaceObject.setFailed(message);
});
for(var __rspack_i in __webpack_exports__)exports[__rspack_i] = __webpack_exports__[__rspack_i];
Object.defineProperty(exports, '__esModule', {
    value: true
});
