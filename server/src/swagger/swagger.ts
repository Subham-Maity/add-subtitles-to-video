import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from './config';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { generateMarkdownDocs } from './generate-swagger-markdown';

export function setupSwagger(app: INestApplication) {
  const options = new DocumentBuilder()
    .setTitle(swaggerConfig.title)
    .setDescription(swaggerConfig.description)
    .setVersion(swaggerConfig.version)
    .addBearerAuth()
    .addTag(swaggerConfig.tags.name, swaggerConfig.tags.description)
    .addServer(swaggerConfig.localUrl, swaggerConfig.localDescription)
    .addServer(swaggerConfig.stagingUrl, swaggerConfig.stagingDescription)
    .addServer(swaggerConfig.productionUrl, swaggerConfig.productionDescription)
    .setLicense(swaggerConfig.license.name, swaggerConfig.license.url)
    .setContact(
      swaggerConfig.contact.name,
      swaggerConfig.contact.url,
      swaggerConfig.contact.email,
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);

  // Write the generated document to files (JSON and YAML)
  fs.writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
  fs.writeFileSync('./swagger.yaml', yaml.dump(document));

  // Generate Markdown documentation
  generateMarkdownDocs('./swagger.json');

  // Optionally, configure the Swagger UI with custom endpoints for the JSON/YAML docs
  SwaggerModule.setup('api-docs', app, document, {
    jsonDocumentUrl: 'swagger.json',
    yamlDocumentUrl: 'swagger.yaml',
  });
}
