# Ansible Info MCP Server

This MCP server provides information about Ansible and helps with playbook management.

## Features

- Get Ansible version information
- List available Ansible modules
- Access installation guides and documentation
- Playbook template management
- Playbook generation from templates
- Playbook validation

## Services

### AnsibleInfoService

Provides information about Ansible:

- `getAnsibleVersion`: Returns the current Ansible version
- `getAnsibleModules`: Lists available Ansible modules
- `getInstallationGuide`: Provides installation instructions and documentation links

### PlaybookService

Manages Ansible playbooks:

- `getTemplates`: Lists available playbook templates
- `generatePlaybook`: Generates a playbook from a template with variables
- `validatePlaybook`: Validates playbook structure and syntax

## Usage

```typescript
// Example: Generate a playbook from template
const response = await playbookService.generatePlaybook({
  body: {
    templateName: 'install-package',
    variables: {
      package_name: 'nginx',
    },
  },
});

// Example: Get Ansible information
const info = await ansibleInfoService.getAnsibleInfo();
```

## Development

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```
