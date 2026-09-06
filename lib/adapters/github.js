import { execFileSync } from 'node:child_process'

function assertRepo(owner, repo) {
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) throw new Error(`Ungültiges GitHub-Repo: ${owner}/${repo}`)
}

const FIELDS = 'number,title,state,body,author,createdAt,updatedAt,labels,comments,url'

export function fetchGithub(owner, repo, number) {
  assertRepo(owner, repo)
  const out = execFileSync(
    'gh', ['issue', 'view', String(number), '--repo', `${owner}/${repo}`, '--json', FIELDS],
    { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 20 }
  )
  return JSON.parse(out)
}

export function postGithubComment(owner, repo, number, bodyFilePath) {
  assertRepo(owner, repo)
  execFileSync('gh', ['issue', 'comment', String(number), '--repo', `${owner}/${repo}`, '--body-file', bodyFilePath], { stdio: 'inherit' })
}

export function closeGithub(owner, repo, number, comment) {
  assertRepo(owner, repo)
  const args = ['issue', 'close', String(number), '--repo', `${owner}/${repo}`]
  if (comment) args.push('--comment', comment)
  execFileSync('gh', args, { stdio: 'inherit' })
}

export function preflightGithub() {
  try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
