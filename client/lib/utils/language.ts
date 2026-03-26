const extensionMap: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  html: "html",
  css: "css",
  scss: "scss",
  less: "less",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  dockerfile: "dockerfile",
  toml: "toml",
  ini: "ini",
  env: "plaintext",
  txt: "plaintext",
  log: "plaintext",
  svg: "xml",
  graphql: "graphql",
  gql: "graphql",
  vue: "html",
  lua: "lua",
  r: "r",
  dart: "dart",
};

export function getLanguageFromPath(filePath: string): string {
  const filename = filePath.split("/").pop() || "";
  const lower = filename.toLowerCase();

  // Special filenames
  if (lower === "dockerfile") return "dockerfile";
  if (lower === "makefile") return "makefile";
  if (lower === ".gitignore") return "plaintext";

  const ext = lower.split(".").pop() || "";
  return extensionMap[ext] || "plaintext";
}
