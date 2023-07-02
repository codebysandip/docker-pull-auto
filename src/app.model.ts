export interface WorkflowPayload {
  action: string;
  workflow_run: WorkflowRun;
  workflow: Workflow;
  repository: Repository;
  sender: Sender;
}

export enum WorkflowStatus {
  in_progress = "in_progress",
  completed = "completed",
}

export interface WorkflowRun {
  id: number;
  name: string;
  node_id: string;
  head_branch: string;
  head_sha: string;
  path: string;
  display_title: string;
  run_number: number;
  event: string;
  status: WorkflowStatus;
  conclusion: string;
  workflow_id: number;
  check_suite_id: number;
  check_suite_node_id: string;
  url: string;
  html_url: string;
  pull_requests: any[];
  created_at: string;
  updated_at: string;
  actor: Actor;
  run_attempt: number;
  referenced_workflows: any[];
  run_started_at: string;
  triggering_actor: TriggeringActor;
  jobs_url: string;
  logs_url: string;
  check_suite_url: string;
  artifacts_url: string;
  cancel_url: string;
  rerun_url: string;
  previous_attempt_url: any;
  workflow_url: string;
  head_commit: HeadCommit;
  repository: Repository;
  head_repository: Repository;
}

export interface Actor {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

export interface TriggeringActor {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

export interface HeadCommit {
  id: string;
  tree_id: string;
  message: string;
  timestamp: string;
  author: Author;
  committer: Committer;
}

export interface Author {
  name: string;
  email: string;
}

export interface Committer {
  name: string;
  email: string;
}

export interface Repository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: Owner;
  html_url: string;
  description: any;
  fork: boolean;
  url: string;
  forks_url: string;
  keys_url: string;
  collaborators_url: string;
  teams_url: string;
  hooks_url: string;
  issue_events_url: string;
  events_url: string;
  assignees_url: string;
  branches_url: string;
  tags_url: string;
  blobs_url: string;
  git_tags_url: string;
  git_refs_url: string;
  trees_url: string;
  statuses_url: string;
  languages_url: string;
  stargazers_url: string;
  contributors_url: string;
  subscribers_url: string;
  subscription_url: string;
  commits_url: string;
  git_commits_url: string;
  comments_url: string;
  issue_comment_url: string;
  contents_url: string;
  compare_url: string;
  merges_url: string;
  archive_url: string;
  downloads_url: string;
  issues_url: string;
  pulls_url: string;
  milestones_url: string;
  notifications_url: string;
  labels_url: string;
  releases_url: string;
  deployments_url: string;
}

export interface Owner {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

export interface Workflow {
  id: number;
  node_id: string;
  name: string;
  path: string;
  state: string;
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  badge_url: string;
}

export interface Sender {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

export interface DockerApp {
  Command: string;
  CreatedAt: string;
  ID: string;
  Image: string;
  Labels: string;
  LocalVolumes: string;
  Mounts: string;
  Names: string;
  Networks: string;
  Ports: string;
  RunningFor: string;
  Size: string;
  State: string;
  Status: string;
}

export interface Config {
  /**
   * Docker apps
   */
  apps: ConfigApp[];
  /**
   * command to run before reading config.json.
   * This enables decryption of config.json via sops or similar tool
   */
  runCommandBeforeConfigRead: string;
}

export interface ConfigApp {
  /**
   * Repository info
   */
  repo: ConfigRepo;
  /**
   * Docker info
   */
  docker: ConfigDocker;
  /**
   * run command before access app.
   * @example decrypt env file before docker app access env file
   */
  runCommandBeforeAccessApp?: string;
}

export interface ConfigRepo {
  /**
   * Repository url
   * @example https://github.com/codebysandip/react-ssr-doc
   */
  url: string;
  /**
   * branch for which docker pull will work
   * @example development
   */
  branch: string;
}

export enum DockerHostedOn {
  aws = "aws",
  dockerHub = "docker-hub",
}

export interface ConfigDocker {
  /**
   * Docker image
   * @example sandipj/react-ssr-doc
   */
  image: string;
  /**
   * tag regex to match tag
   * We get all tags from docker and match with tagRegex
   */
  tagRegex: string;
  /**
   * where docker image hosted on
   * @enum {DockerHostedOn}
   */
  hostedOn: DockerHostedOn;
  /**
   * Name which will use to run docker image
   */
  name: string;
  /**
   * Internal and external
   * @example 3000:5000
   */
  port: string;
  /**
   * docker environment variables
   * These variables passed as environment variables while running docker image
   */
  env?: Record<string, string>;
  /**
   * path of env file.
   * we pass env file while running docker image
   */
  envFile?: string;
}

export interface DockerAuthResponse {
  token: string;
  access_token: string;
  expires_in: number;
  issued_at: string;
}

export interface DockerTagResponse {
  // count: number;
  // next: string;
  // previous: any;
  // results: DockerTagResult[];
  name: string;
  tags: string[];
}

export interface DockerTagResult {
  creator: number;
  id: number;
  images: DockerImage[];
  last_updated: string;
  last_updater: number;
  last_updater_username: string;
  name: string;
  repository: number;
  full_size: number;
  v2: boolean;
  tag_status: string;
  tag_last_pulled: string;
  tag_last_pushed: string;
  media_type: string;
  content_type: string;
  digest: string;
}

export interface DockerImage {
  architecture: string;
  features: string;
  variant: any;
  digest: string;
  os: string;
  os_features: string;
  os_version: any;
  size: number;
  status: string;
  last_pulled: string;
  last_pushed: string;
}
