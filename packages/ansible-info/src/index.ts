import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as YAML from 'yaml';

// Create MCP Server instance
const server = new McpServer({
  name: 'ansible-info',
  version: '1.0.0',
  capabilities: {
    resources: {},
  },
});

// Define types
interface AnsibleInfo {
  version: string;
  installation: {
    rhel: string[];
    ubuntu: string[];
    pip: string[];
  };
  documentation: {
    main: string;
    installation: string;
    playbooks: string;
  };
  modules: string[];
}

interface PlaybookTask {
  name: string;
  module: string;
  args: Record<string, any>;
}

interface Playbook {
  name: string;
  hosts: string[];
  tasks: PlaybookTask[];
  vars?: Record<string, any>;
}

// Helper function to get Ansible info
async function getAnsibleInfo(): Promise<AnsibleInfo> {
  return {
    version: '2.15.5',
    installation: {
      rhel: [
        'sudo subscription-manager repos --enable ansible-2.9-for-rhel-8-x86_64-rpms',
        'sudo dnf install ansible',
        '# Alternative method using EPEL',
        'sudo dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm',
        'sudo dnf install ansible',
      ],
      ubuntu: [
        'sudo apt update',
        'sudo apt install software-properties-common',
        'sudo apt-add-repository --yes --update ppa:ansible/ansible',
        'sudo apt install ansible',
      ],
      pip: [
        'sudo dnf install python3-pip  # For RHEL/CentOS',
        'sudo apt install python3-pip  # For Ubuntu',
        'pip3 install --user ansible',
      ],
    },
    documentation: {
      main: 'https://docs.ansible.com',
      installation:
        'https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html',
      playbooks:
        'https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_intro.html',
    },
    modules: [
      'command',
      'shell',
      'copy',
      'file',
      'yum',
      'apt',
      'dnf',
      'service',
      'template',
      'git',
      'user',
      'group',
      'cron',
      'mount',
      'systemd',
      'firewalld',
    ],
  };
}

// Tool: Get Ansible Version
server.tool(
  'get-ansible-version',
  'Get the current Ansible version information',
  {},
  async () => {
    try {
      const info = await getAnsibleInfo();
      return {
        content: [
          {
            type: 'text',
            text: `Ansible Version: ${info.version}\n\nDocumentation Links:\n- Main: ${info.documentation.main}\n- Installation Guide: ${info.documentation.installation}\n- Playbook Guide: ${info.documentation.playbooks}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching Ansible version: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get Ansible Modules
server.tool(
  'get-ansible-modules',
  'Get list of available Ansible modules',
  {},
  async () => {
    try {
      const info = await getAnsibleInfo();
      return {
        content: [
          {
            type: 'text',
            text:
              'Available Ansible Modules:\n\n' +
              info.modules.map((m) => `- ${m} `).join('\n') +
              '\n\nFor a complete list, visit: https://docs.ansible.com/ansible/latest/collections/index_module.html',
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching Ansible modules: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get Installation Guide
server.tool(
  'get-installation-guide',
  'Get Ansible installation and documentation information',
  {},
  async () => {
    try {
      const info = await getAnsibleInfo();

      const installGuide = `
Installation Guide for Different Systems:

1. RHEL/CentOS Installation:
${info.installation.rhel.join('\n')}

2. Ubuntu Installation:
${info.installation.ubuntu.join('\n')}

3. Python pip Installation (Cross-platform):
${info.installation.pip.join('\n')}

After installation, verify with:
ansible --version

Documentation Links:
- Main Documentation: ${info.documentation.main}
- Detailed Installation Guide: ${info.documentation.installation}
- Playbook Guide: ${info.documentation.playbooks}

Note: For RHEL, make sure your system is registered with Red Hat Subscription Management before installation.
`;

      return {
        content: [
          {
            type: 'text',
            text: installGuide,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching installation guide: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Generate Playbook
server.tool(
  'generate-playbook',
  'Generate an Ansible playbook from template',
  {
    templateName: z.string().describe('Name of the template to use'),
    variables: z
      .record(z.any())
      .optional()
      .describe('Variables to use in the template'),
  },
  async ({ templateName, variables }) => {
    try {
      const templates: Record<string, Playbook> = {
        'install-package': {
          name: 'Install Package Playbook',
          hosts: ['all'],
          tasks: [
            {
              name: 'Install package',
              module: 'package',
              args: {
                name: '{{ package_name }}',
                state: 'present',
              },
            },
          ],
          vars: {
            package_name: variables?.package_name || 'httpd',
          },
        },
        'configure-service': {
          name: 'Configure Service Playbook',
          hosts: ['all'],
          tasks: [
            {
              name: 'Ensure service is installed',
              module: 'package',
              args: {
                name: '{{ service_name }}',
                state: 'present',
              },
            },
            {
              name: 'Configure service',
              module: 'template',
              args: {
                src: '{{ config_template }}',
                dest: '{{ config_path }}',
              },
            },
            {
              name: 'Start and enable service',
              module: 'systemd',
              args: {
                name: '{{ service_name }}',
                state: 'started',
                enabled: true,
              },
            },
          ],
          vars: {
            service_name: variables?.service_name || 'httpd',
            config_template:
              variables?.config_template || 'templates/service.conf.j2',
            config_path: variables?.config_path || '/etc/httpd/conf/httpd.conf',
          },
        },
        'setup-user': {
          name: 'User Setup Playbook',
          hosts: ['all'],
          tasks: [
            {
              name: 'Create user group',
              module: 'group',
              args: {
                name: '{{ group_name }}',
                state: 'present',
              },
            },
            {
              name: 'Create user',
              module: 'user',
              args: {
                name: '{{ username }}',
                group: '{{ group_name }}',
                shell: '{{ user_shell }}',
                createhome: true,
              },
            },
          ],
          vars: {
            username: variables?.username || 'ansible-user',
            group_name: variables?.group_name || 'ansible-group',
            user_shell: variables?.user_shell || '/bin/bash',
          },
        },
      };

      const template = templates[templateName];
      if (!template) {
        throw new Error(
          `Template '${templateName}' not found. Available templates: ${Object.keys(
            templates
          ).join(', ')}`
        );
      }

      // Deep clone the template to avoid modifying the original
      const playbook = JSON.parse(JSON.stringify(template));

      // Merge variables
      if (variables) {
        playbook.vars = {
          ...template.vars,
          ...variables,
        };
      }

      const yamlContent = YAML.stringify([playbook], {
        indent: 2,
        lineWidth: -1,
      });

      return {
        content: [
          {
            type: 'text',
            text: `# Generated Ansible Playbook for template: ${templateName}\n${yamlContent}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating playbook: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Ansible Info MCP Server running on stdio');
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
