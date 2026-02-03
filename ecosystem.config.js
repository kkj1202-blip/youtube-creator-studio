module.exports = {
  apps: [
    {
      name: "autokim-frontend",
      script: "npm",
      args: "run dev:frontend",
      watch: false,
      max_memory_restart: "4G",
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "autokim-backend",
      script: "python",
      args: "main.py",
      cwd: "./python-core",
      watch: ["."],
      ignore_watch: ["node_modules", "public/uploads", "logs"],
      env: {
        PYTHONPATH: "."
      }
    }
  ]
};
