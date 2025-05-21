# ScarletMesh

**ScarletMesh** is a monorepo for intelligent MCP (Model-Controller-Protocol) services that provide contextual data through natural language queries. Powered by Nx for modular development, this workspace currently hosts three primary services:

- 🔍 * Labs Finder**
- 🛡️ **CVE Insight Server**
- 📆 **Product Lifecycle Server**

---

## 🧠 Overview

ScarletMesh enables teams, support engineers, and security professionals to quickly access and understand internal tooling, CVE information, and product lifecycle data using intuitive natural language queries.

This repository follows a **monorepo pattern using Nx**, offering consistent tooling, fast builds, and a clear structure for scalable development.

---

## Prerequisites

- node v22.14.0
- Ollama
  - llama3.2:3b

---

## 📦 MCP Services

### 1. Labs Finder

- **Endpoint**: `POST /labs-query`
- **Payload**:
  ```json
  { "query": "I need a tool to check RHEL performance" }
  ```
- **Returns**: Best matching Labs resource/tool

### 2. CVE Insight Server

- **Endpoint**: `GET /cve/CVE-2023-1234`
- **Returns**: Structured CVE metadata from CVE feeds

### 3. Product Lifecycle Server

- **Endpoint**: `POST /lifecycle-query`
- **Payload**:
  ```json
  { "query": "When does RHEL 8 go EOL?" }
  ```
- **Returns**: EOL dates and support policy info

---

## 🛠️ Getting Started

### 📦 Install dependencies

```sh
npm install
```

### 🚀 Build a service

```sh
npx nx build <project-name>
```

### 🧪 Run MCP-Client

```sh
npx nx run client-setup:build
```

### ▶️ Run Frontend

```sh
npx nx run frontend:dev
```

### Run Both Client and Frontend

```sh
nx run-many --target=build --projects=client-setup,frontend
```

### Run everything in parallel

```sh
npx nx run @scarlet-mesh:start-all
```

### 🧰 View workspace graph

```sh
npx nx graph
```

---

## 📐 Architecture Phases

### Phase 1 – Discovery

- Identify data sources: Labs API, CVE feeds, lifecycle DB
- Define access roles (if needed)

### Phase 2 – Formalization

- API spec per MCP service
- Define consistent JSON output schemas

### Phase 3 – Implementation

- Containerize services
- Test with real-world queries
- Rollout to staging → production

---

## 🚀 Deployment Plan

- Internal staging with feedback loop
- Add observability and logging
- Gradual rollout to production environments

---

## 🧭 Future Enhancements

- AI-powered CVE summarization
- Ranking tools by usage/popularity
- Lifecycle recommendations + migration docs

---

## 🤝 Stakeholders

- 🔧 Engineering Teams
- 💬 Customer Support
- 🧑‍💼 Product Management
- 🧪 Security Response Team
- 🧰 Labs Maintainers

---

## ✅ Acceptance Criteria

- Services return accurate, relevant responses
- Queries match expected formats naturally
- Performance under standard load is stable

---

## 📚 Resources

- [Technical Planning Document (internal)](https://gitlab.cee.redhat.com/digital-engineering/scarlet-mesh)
- [Nx Documentation](https://nx.dev)

---

## 💡 Tips for Nx

- Run tasks: `npx nx <target> <project>`
- Sync TS project refs: `npx nx sync`
- Release packages: `npx nx release [--dry-run]`
- Generate new libraries:
  ```sh
  npx nx g @nx/js:lib packages/<pkg-name> --publishable --importPath=@scarletmesh/<pkg-name>
  ```

---

## 📎 Join the Community

- [Nx Discord](https://go.nx.dev/community)
- [Nx Blog](https://nx.dev/blog)
