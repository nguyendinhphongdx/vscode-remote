import React from "react";

const ICON_SIZE = 16;

function MaterialIcon({ name }: { name: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/file-icons/${name}.svg`}
      alt=""
      width={ICON_SIZE}
      height={ICON_SIZE}
      className="shrink-0 block"
      draggable={false}
    />
  );
}

// File extension -> icon name mapping
const fileExtMap: Record<string, string> = {
  ts: "typescript",
  tsx: "react_ts",
  js: "javascript",
  jsx: "react",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  html: "html",
  htm: "html",
  css: "css",
  scss: "css",
  less: "css",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  dart: "dart",
  rb: "ruby",
  php: "php",
  vue: "vue",
  svelte: "svelte",
  sh: "bashly",
  bash: "bashly",
  zsh: "bashly",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  svg: "svg",
  graphql: "graphql",
  gql: "graphql",
  sql: "sql",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  ico: "image",
  lock: "lock",
  log: "log",
  dockerfile: "docker",
  gradle: "gradle",
  makefile: "makefile",
};

// Special filename -> icon name mapping
const specialFileMap: Record<string, string> = {
  ".gitignore": "git",
  ".gitattributes": "git",
  ".env": "nodejs",
  ".env.local": "nodejs",
  ".env.example": "nodejs",
  ".env.development": "nodejs",
  ".env.production": "nodejs",
  "package.json": "nodejs",
  "package-lock.json": "lock",
  "tsconfig.json": "typescript",
  "next.config.ts": "next",
  "next.config.js": "next",
  "next.config.mjs": "next",
  "next-env.d.ts": "typescript-def",
  "eslint.config.mjs": "eslint",
  ".eslintrc.json": "eslint",
  "postcss.config.mjs": "css",
  "tailwind.config.ts": "tailwindcss",
  "tailwind.config.js": "tailwindcss",
  "dockerfile": "docker",
  "docker-compose.yml": "docker",
  "docker-compose.yaml": "docker",
  "makefile": "makefile",
};

// Folder name -> icon base name mapping
const folderMap: Record<string, string> = {
  src: "folder-src",
  app: "folder-app",
  components: "folder-components",
  lib: "folder-lib",
  hooks: "folder-hook",
  utils: "folder-utils",
  public: "folder-public",
  store: "folder-store",
  ui: "folder-ui",
  layout: "folder-layout",
  server: "folder-server",
  config: "folder-config",
  dist: "folder-dist",
  build: "folder-dist",
  test: "folder-test",
  tests: "folder-test",
  types: "folder-typescript",
  interfaces: "folder-interface",
  services: "folder-api",
  handlers: "folder-controller",
  auth: "folder-secure",
  providers: "folder-context",
  middleware: "folder-middleware",
  node_modules: "folder-node",
  ".git": "folder-git",
  ".next": "folder-next",
  ".claude": "folder-claude",
  shared: "folder-shared",
  styles: "folder-css",
  css: "folder-css",
  routes: "folder-routes",
  docker: "folder-docker",
  terminal: "folder-console",
  editor: "folder-typescript",
  "file-explorer": "folder-components",
  ws: "folder-connection",
  api: "folder-api",
  helpers: "folder-helper",
  functions: "folder-functions",
  constants: "folder-constant",
  context: "folder-context",
  database: "folder-database",
  db: "folder-database",
  events: "folder-event",
  global: "folder-global",
  resources: "folder-resource",
  models: "folder-class",
  commands: "folder-command",
  guards: "folder-guard",
  pipes: "folder-pipe",
  private: "folder-private",
  repository: "folder-repository",
};

export function getFileIconComponent(filename: string): React.ReactElement {
  const lower = filename.toLowerCase();

  // Check special filenames first
  const special = specialFileMap[lower];
  if (special) return <MaterialIcon name={special} />;

  // Check extension
  const ext = lower.split(".").pop() || "";
  const extIcon = fileExtMap[ext];
  if (extIcon) return <MaterialIcon name={extIcon} />;

  return <MaterialIcon name="file" />;
}

export function getFolderIconComponent(
  foldername: string,
  isOpen: boolean
): React.ReactElement {
  const lower = foldername.toLowerCase();
  const base = folderMap[lower] || "folder";
  const iconName = isOpen ? `${base}-open` : base;
  return <MaterialIcon name={iconName} />;
}
