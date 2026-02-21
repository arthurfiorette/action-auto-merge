import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldAutoMerge } from '../src/parse.js';

test('allows in-range patch updates', () => {
  assert.equal(
    shouldAutoMerge({
      title: 'chore(deps): bump api-problem from 6.1.2 to 6.1.4 in /path',
      target: 'patch'
    }),
    true
  );
});

test('blocks out-of-range major updates', () => {
  assert.equal(
    shouldAutoMerge({
      title: 'chore(deps): bump api-problem from 6.1.2 to 7.0.0 in /path',
      target: 'patch'
    }),
    false
  );
});

test('requires from version for production checks', () => {
  assert.equal(
    shouldAutoMerge({
      title: 'Update actions/setup-python requirement to v2.1.4 in /path',
      target: 'major'
    }),
    false
  );
});
