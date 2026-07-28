import * as Joi from 'joi';

export const validateConfig = Joi.object({
  // Server Configuration
  PORT: Joi.number().optional(),
  API_URL: Joi.string().allow('').optional(),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  LOG_SLOW_QUERIES: Joi.boolean().truthy('true').falsy('false').optional(),
  API_DOC_URL: Joi.string().allow('').optional(),

  // Database Configuration
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .error(new Error('DATABASE_URL is missing or invalid')),
});
