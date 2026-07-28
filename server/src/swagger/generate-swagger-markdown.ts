import * as fs from 'fs';
import * as path from 'path';

interface SwaggerPath {
  [method: string]: {
    summary?: string;
    description?: string;
    tags?: string[];
    operationId?: string;
    requestBody?: any;
    responses?: any;
    parameters?: any[];
  };
}

interface SwaggerDocument {
  paths: {
    [path: string]: SwaggerPath;
  };
  components?: {
    schemas?: any;
  };
}

export function generateMarkdownDocs(
  swaggerFilePath: string = './swagger.json',
) {
  const swaggerDoc: SwaggerDocument = JSON.parse(
    fs.readFileSync(swaggerFilePath, 'utf-8'),
  );

  let markdown = '# API Documentation\n\n';

  // Generate TOC
  markdown += '## Table of Contents\n\n';

  const routesByTag: {
    [tag: string]: Array<{ path: string; method: string; summary: string }>;
  } = {};

  // Organize routes by tags
  Object.entries(swaggerDoc.paths).forEach(([path, pathObj]) => {
    Object.entries(pathObj).forEach(([method, operation]) => {
      if (method === 'parameters') return;

      const tags = operation.tags || ['Untagged'];
      const summary = operation.summary || path;

      tags.forEach((tag) => {
        if (!routesByTag[tag]) {
          routesByTag[tag] = [];
        }
        routesByTag[tag].push({ path, method: method.toUpperCase(), summary });
      });
    });
  });

  // Generate TOC by category (tags)
  Object.entries(routesByTag)
    .sort()
    .forEach(([tag, routes]) => {
      markdown += `### ${tag}\n\n`;

      routes.forEach((route) => {
        const anchor = generateAnchor(route.method, route.path);
        markdown += `- **${route.method}** \`${route.path}\` - [${route.summary}](#${anchor})\n`;
      });
      markdown += '\n';
    });

  markdown += '---\n\n';

  // Generate detailed route documentation
  markdown += '## Endpoints\n\n';

  Object.entries(routesByTag)
    .sort()
    .forEach(([tag, routes]) => {
      markdown += `## ${tag}\n\n`;

      routes.forEach((route) => {
        const operation =
          swaggerDoc.paths[route.path][route.method.toLowerCase()];

        markdown += `### ${route.summary}\n\n`;
        markdown += `**${route.method}** \`${route.path}\`\n\n`;

        if (operation.description) {
          markdown += `${operation.description}\n\n`;
        }

        // Parameters
        if (operation.parameters && operation.parameters.length > 0) {
          markdown += '**Parameters:**\n\n';
          operation.parameters.forEach((param) => {
            markdown += `- \`${param.name}\` (${param.in}) - ${param.description || ''}\n`;
          });
          markdown += '\n';
        }

        // Request Body
        if (operation.requestBody) {
          markdown += '**Request Body:**\n\n';
          const content = operation.requestBody.content;
          if (content && content['application/json']) {
            const schema = content['application/json'].schema;
            if (schema.$ref) {
              const schemaName = schema.$ref.split('/').pop();
              markdown += `\`\`\`json\n${formatSchema(swaggerDoc, schemaName)}\n\`\`\`\n\n`;
            } else {
              markdown += `\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\`\n\n`;
            }
          }
        }

        // Responses
        if (operation.responses) {
          markdown += '**Responses:**\n\n';
          Object.entries(operation.responses).forEach(
            ([statusCode, response]: [string, any]) => {
              markdown += `**${statusCode}** - ${response.description}\n\n`;

              if (response.content && response.content['application/json']) {
                const schema = response.content['application/json'].schema;
                if (schema.$ref) {
                  const schemaName = schema.$ref.split('/').pop();
                  markdown += `\`\`\`json\n${formatSchema(swaggerDoc, schemaName)}\n\`\`\`\n\n`;
                } else if (schema.type || schema.properties) {
                  markdown += `\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\`\n\n`;
                }
              }
            },
          );
        }

        markdown += '---\n\n';
      });
    });

  // Write to file
  const outputPath = path.join(process.cwd(), 'API_DOCUMENTATION.md');
  fs.writeFileSync(outputPath, markdown);
  console.log(`✅ Markdown documentation generated: ${outputPath}`);
}

function generateAnchor(method: string, path: string): string {
  return `${method.toLowerCase()}-${path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
}

function formatSchema(swaggerDoc: SwaggerDocument, schemaName: string): string {
  if (!swaggerDoc.components?.schemas?.[schemaName]) {
    return '{}';
  }

  const schema = swaggerDoc.components.schemas[schemaName];
  const example: any = {};

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
      if (value.example !== undefined) {
        example[key] = value.example;
      } else if (value.type === 'string') {
        example[key] = value.format === 'email' ? 'user@example.com' : 'string';
      } else if (value.type === 'number' || value.type === 'integer') {
        example[key] = 0;
      } else if (value.type === 'boolean') {
        example[key] = true;
      } else if (value.type === 'array') {
        example[key] = [];
      } else if (value.type === 'object') {
        example[key] = {};
      } else {
        example[key] = null;
      }
    });
  }

  return JSON.stringify(example, null, 2);
}
