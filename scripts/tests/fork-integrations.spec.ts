/** Upstream-owned integrations must not target upstream resources from forks. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

interface Step {
  name?: string
  if?: string
  run?: string
}

interface Job {
  if?: string
  steps: Step[]
}

function job(file: string, name: string): Job {
  const workflow = load(readFileSync(resolve(import.meta.dirname, '../../.github/workflows', file), 'utf8')) as {
    jobs: Record<string, Job>
  }
  return workflow.jobs[name]!
}

const upstream = 'deepseek-harness/deepseek-harness'
const fork = 'Mason-Code-Sketch/deepseek-harness'

function eligible(condition: string, repository: string, head = repository, eventName = 'pull_request', action = 'opened', reviewState = 'approved', changes = {}): boolean {
  return runInNewContext(condition, {
    github: {
      repository,
      event_name: eventName,
      event: { action, review: { state: reviewState }, changes, pull_request: { head: { repo: { full_name: head } } } },
    },
  }, { timeout: 1000 }) as boolean
}

describe('upstream-owned integrations', () => {
  it.each([
    ['issue-policy.yml', 'policy'],
    ['issue-lifecycle.yml', 'lifecycle'],
  ])('scopes %s to the organization owning its project', (file, name) => {
    const condition = job(file, name).if!
    expect(eligible(condition, upstream)).toBe(true)
    expect(eligible(condition, fork)).toBe(false)
  })

  it('preserves lifecycle event filters inside upstream', () => {
    const condition = job('issue-lifecycle.yml', 'lifecycle').if!
    expect(eligible(condition, upstream, upstream, 'pull_request_review')).toBe(false)
    expect(eligible(condition, upstream, upstream, 'pull_request_review', 'submitted', 'changes_requested')).toBe(true)
    expect(eligible(condition, upstream, upstream, 'pull_request', 'edited')).toBe(false)
    expect(eligible(condition, upstream, upstream, 'pull_request', 'edited', 'approved', { body: {} })).toBe(true)
    expect(eligible(condition, upstream, upstream, 'issues')).toBe(true)
  })

  it('always builds previews but deploys and verifies only trusted upstream PRs', () => {
    const preview = job('build-preview-cloudflare.yml', 'preview')
    expect(preview.if).toBeUndefined()
    for (const name of ['Install (immutable)', 'Build workspace', 'Build the preview page and pack the VFS image', 'Shape the upload']) {
      const step = preview.steps.find(step => step.name === name)!
      expect(step.run).toBeTruthy()
      expect(step.if).toBeUndefined()
    }
    const report = preview.steps.find(step => step.name === 'Report skipped deployment')!
    expect(report.run).toContain('verification skipped')
    expect(report.run).toContain('GITHUB_STEP_SUMMARY')
    for (const name of ['Upload to Cloudflare Pages', 'Verify the protected deployment serves the image', 'Comment the preview URL']) {
      const step = preview.steps.find(step => step.name === name)!
      for (const [repository, head, expected] of [[upstream, upstream, true], [fork, fork, false], [upstream, fork, false]] as const) {
        expect(eligible(step.if!, repository, head)).toBe(expected)
        expect(eligible(report.if!, repository, head)).toBe(!expected)
      }
    }
  })
})
