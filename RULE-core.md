# NestJS Core Coding Rules

Portable rules for any NestJS project. Zero project-specific references.
For project-specific extensions, see `RULE-project.md`.

> **Version:** see `RULE-CHANGELOG.md`

---

## Table of Contents

1. [Module Folder Structure](#module-folder-structure)
2. [Naming Rules](#naming-rules)
3. [Barrel Exports](#barrel-exports-indexts)
4. [Import Rules](#import-rules)
5. [Config Layer](#config-layer)
6. [Constants Layer](#constants-layer)
7. [Types Layer](#types-layer)
8. [DTO Layer](#dto-layer)
9. [Repository Layer](#repository-layer)
10. [Service Layer](#service-layer)
11. [Layered Service Pattern](#layered-service-pattern)
12. [Orchestrator Pattern](#orchestrator-pattern)
13. [Registry Pattern](#registry-pattern)
14. [Controller Layer](#controller-layer)
15. [Guard Layer](#guard-layer)
16. [Decorator Layer](#decorator-layer)
17. [Exception Layer](#exception-layer)
18. [Helpers Layer](#helpers-layer)
19. [Provider Layer (Redis & external clients)](#provider-layer-redis--external-clients)
20. [Module Registration](#module-registration)
21. [Security Comment Discipline](#security-comment-discipline)
22. [JSDoc Rules](#jsdoc-rules)
23. [Section Dividers](#section-dividers)
24. [Zod Validation](#zod-validation)
25. [Redis Key Registry](#redis-key-registry)
26. [Fire-and-Forget Pattern](#fire-and-forget-pattern)
27. [Atomic Redis Operations](#atomic-redis-operations)
28. [SSE / Streaming Pattern](#sse--streaming-pattern)
29. [Quick Checklist (new feature)](#quick-checklist-new-feature)

---

## Module Folder Structure

Every feature lives in its own folder under `src/`. Only create the sub-folders relevant
to your feature — do not create empty placeholder folders.

```
src/
└── <feature>/
    ├── <feature>.module.ts
    ├── index.ts                    ← barrel: exports ONLY the module class
    ├── controller/
    │   ├── <feature>.controller.ts (or role-scoped: admin.controller.ts, user.controller.ts…)
    │   └── index.ts
    ├── service/
    │   ├── <role>/
    │   │   └── <role>-<feature>.service.ts
    │   └── index.ts
    ├── repository/
    │   ├── <role>/
    │   │   └── <role>-<feature>.repository.ts
    │   └── index.ts
    ├── dto/
    │   ├── <role>/
    │   │   ├── <role>.dto.ts
    │   │   └── <role>-response.dto.ts
    │   └── index.ts
    ├── types/
    │   ├── <feature>.types.ts
    │   └── index.ts
    ├── config/           ← optional: typed config classes + static constant objects
    │   ├── <name>.config.ts
    │   └── index.ts
    ├── constants/        ← optional: SCREAMING_SNAKE enum-like objects + union types
    │   ├── <name>.constants.ts
    │   └── index.ts
    ├── guard/            ← optional
    │   ├── <name>.guard.ts
    │   └── index.ts
    ├── decorator/        ← optional
    │   ├── <name>.decorator.ts
    │   └── index.ts
    ├── exceptions/       ← optional: custom HTTP exception classes
    │   ├── <name>.exception.ts
    │   └── index.ts
    ├── helpers/          ← optional: pure utility functions (not @Injectable)
    │   ├── <name>.helper.ts
    │   └── index.ts
    ├── providers/        ← optional: factory providers (Redis clients, SDK clients)
    │   ├── <name>.provider.ts
    │   └── index.ts
    └── registry/         ← optional: plugin/tool registries (OnApplicationBootstrap)
        ├── <name>-registry.ts
        └── index.ts
```

**Structural variations by complexity:**

```
Simple CRUD module:
  src/<feature>/  →  controller/, service/, repository/, dto/, types/

Auth/security module:
  src/<feature>/  →  controller/, service/, repository/, dto/, guard/,
                     decorator/, config/, constants/, types/, exceptions/, helpers/,
                     providers/  (dedicated Redis client)

Complex pipeline module (e.g. AI/LLM workflow):
  src/<feature>/  →  controller/
                     service/<role>/           orchestrator
                     service/core/             focused single-concern layers
                     service/core/utility/     sub-services injected into layers
                     service/llm/              LLM provider abstraction
                     registry/                 dynamic tool/handler registry
                     providers/, config/, dto/, types/
```

---

## Naming Rules

| Layer          | File name pattern                               | Class name pattern               |
|----------------|-------------------------------------------------|----------------------------------|
| Module         | `<feature>.module.ts`                           | `FeatureModule`                  |
| Controller     | `<feature>.controller.ts` or `<role>.controller.ts` | `FeatureController`          |
| Service        | `<role>-<feature>.service.ts`                   | `RoleFeatureService`             |
| Orchestrator   | `<role>-<feature>.orchestrator.ts`              | `RoleFeatureOrchestrator`        |
| Layer          | `<name>.layer.ts`                               | `NameLayer`                      |
| Repository     | `<role>-<feature>.repository.ts`                | `RoleFeatureRepository`          |
| DTO (body)     | `<role>.dto.ts` / `<role>-response.dto.ts`      | `RoleActionDto`                  |
| DTO (query)    | `query-<feature>.dto.ts` or `<feature>.dto.ts`  | `Query<Feature>Dto`              |
| DTO (response) | `<name>-response.dto.ts`                        | `<Name>Dto` (Swagger shape only) |
| Guard          | `<name>.guard.ts`                               | `NameGuard`                      |
| Types          | `<feature>.types.ts`                            | (interfaces / types only)        |
| Decorator      | `<name>.decorator.ts`                           | —                                |
| Constants      | `<name>.constants.ts`                           | —                                |
| Config         | `<name>.config.ts`                              | `NameConfig` (`@Injectable`)     |
| Exception      | `<name>.exception.ts`                           | `NameException`                  |
| Helper         | `<name>.helper.ts`                              | — (plain exported functions)     |
| Provider       | `<feature>-<client>.provider.ts`                | — (NestJS `Provider` object)     |
| Registry       | `<name>-registry.ts`                            | `NameRegistry`                   |

- Use **kebab-case** for all file and folder names.
- Use **PascalCase** for all class names.
- Service sub-roles live under `service/<role>/` when there are multiple roles.
- When a service contains complex sub-systems, split into:
  - `service/<role>/` — orchestrator(s) facing the controller
  - `service/core/` — focused single-responsibility layers
  - `service/core/utility/` — sub-services injected into layers

---

## Barrel Exports (`index.ts`)

Every layer folder **must** have an `index.ts` that re-exports everything from it.

```ts
// service/index.ts — explicit named exports, not `export *` for large files
export { AdminFeatureOrchestrator } from './admin/admin-feature.orchestrator';
export { FeatureSessionService } from './core/utility/session';
// ... list every public class

// guard/index.ts
export * from './auth.guard';
export * from './rbac.guard';

// constants/index.ts
export * from './permissions.constants';
export * from './redis-keys';
```

The **root** `index.ts` exports only the module:

```ts
// src/<feature>/index.ts
export * from './<feature>.module';
```

> **Rule:** Never export internals from the root `index.ts`. Only the module class,
> so `app.module.ts` imports stay clean.

---

## Import Rules

Always import from the **layer barrel**, never from the raw file path.

```ts
// ✅ Correct — import from barrel
import { FeatureService } from '../service';
import { FeatureRepository } from '../repository';
import { AuthGuard } from '../guard';
import { CreateDto } from '../dto';
import { RequestWithUser } from '../types';
import { FEATURE_KEYS } from '../constants/redis-keys'; // sub-file OK when not in barrel

// ❌ Wrong — never import from raw implementation file
import { FeatureService } from '../service/admin/admin-feature.service';
```

Cross-module imports use the `src/` path alias:

```ts
// ✅ Correct — cross-module
import { CreateDto } from 'src/auth/dto';
import { FeatureRepository } from 'src/auth/repository';
import { PrismaService } from 'src/prisma/prisma.service';

// ❌ Wrong — relative traversal across module boundaries
import { CreateDto } from '../../auth/dto/admin/admin.dto';
```

---

## Config Layer

Use a typed `@Injectable()` class to read `ConfigService` values, not inline
`process.env` reads scattered through service files.

```ts
// config/redis.config.ts
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { RedisOptions } from 'ioredis';

@Injectable()
export class RedisConfig {
  constructor(private configService: ConfigService) {}

  get RedisHost(): string {
    const host = this.configService.get<string>('REDIS_HOST')!;
    // Handle host:port strings (Upstash-style) gracefully
    return host.includes(':') ? host.split(':')[0] : host;
  }

  get RedisPort(): number {
    const host = this.configService.get<string>('REDIS_HOST')!;
    if (host.includes(':')) return parseInt(host.split(':')[1], 10);
    return Number(this.configService.get<number>('REDIS_PORT') ?? 6379);
  }

  getRedisConfig(): RedisOptions {
    const config: RedisOptions = {
      host: this.RedisHost,
      port: this.RedisPort,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
    if (this.RedisPassword) config.password = this.RedisPassword;
    return config;
  }
}
```

For **static** runtime constants (not environment-derived), use a plain `as const`
object instead:

```ts
// config/feature.config.ts
/**
 * FEATURE_CONFIG
 *
 * Single source of truth for all timing, rate-limit, and cleanup constants.
 * Never hardcode these values elsewhere.
 */
export const FEATURE_CONFIG = {
  // ── Rate limiting ─────────────────────────────────────────────────────────
  /** Window in seconds for the rate limit counter. */
  RATE_LIMIT_WINDOW_SECONDS: 300,
  /** Maximum attempts in the window before locking. */
  MAX_ATTEMPTS: 3,

  // ── Cache TTLs ────────────────────────────────────────────────────────────
  /** Revocation cache TTL. Short to limit JWKS round-trip savings window. */
  REVOCATION_CACHE_TTL_SECONDS: 5,
} as const;
```

Rules:
- Every section inside the config object gets a `// ── Section ─────` divider.
- Every entry gets a `/** JSDoc comment */` explaining **why** the value is what it is.
- Use `as const` so TypeScript narrows values to their literal types.

---

## Constants Layer

Use `constants/` for domain constants that multiple layers share.

```ts
// constants/permissions.constants.ts
/**
 * PERMISSIONS
 *
 * Master list of every permission key in the system.
 * Format: `resource:action`
 */
export const PERMISSIONS = {
  // ── Items ─────────────────────────────────────────────────────────────────
  ITEM_READ:   'item:read',
  ITEM_CREATE: 'item:create',
  ITEM_UPDATE: 'item:update',
  ITEM_DELETE: 'item:delete',

  // ── Members ───────────────────────────────────────────────────────────────
  MEMBER_INVITE: 'member:invite',
  MEMBER_REMOVE: 'member:remove',
} as const;

/** Union type of every valid permission key string. */
export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Reflector metadata key used by @RequirePermissions() and RbacGuard. */
export const PERMISSIONS_KEY = 'required_permissions';
```

Rules:
- Group constants by domain with `// ── Domain ──` section dividers.
- Immediately export the `as const` derived union type below the object.
- Export any related metadata keys (e.g. Reflector keys) in the same file.

---

## Types Layer

- Use `interface` for object shapes; `type` for unions, intersections, and aliases.
- Every field must have a `/** JSDoc comment */`.
- Co-locate Zod schemas in the types file when they validate the same shapes.
- Use section dividers between logical groups.

```ts
// types/feature.types.ts
import { z } from 'zod';

// ─── Core Entities ────────────────────────────────────────────────────────────

/** Authenticated user attached to request by the auth guard. */
export interface AuthenticatedUser {
  /** Firebase UID */
  uid: string;
  /** Database CUID */
  dbId: string;
  /** Verified email address */
  email: string;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const CreateItemSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive(),
});

export type CreateItemResult = z.infer<typeof CreateItemSchema>;
```

Rules:
- Include a version comment at the top of types files that have evolved (e.g. `// v3`).
- Co-locate Zod schemas with their TypeScript interface counterparts.
- Export `z.infer<typeof Schema>` as a type alias so callers use the TS type, not the schema.
- `[SECURITY]` comments on fields that carry security implications (e.g. `is_email_verified`).

---

## DTO Layer

- Request DTOs: `<role>.dto.ts` — validates incoming payloads.
- Response DTOs: `<name>-response.dto.ts` — shapes outgoing payloads (Swagger only).
- Query-param DTOs: named `Query<Feature>Dto` — all fields optional with defaults.
- Files live under `dto/<role>/` or flat in `dto/` for single-role modules.

### Request DTO (body payload)

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * LoginDto
 *
 * Payload for POST /auth/login.
 */
export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Provide a valid email address' })
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  @ApiProperty({ description: 'Provider ID token', maxLength: 4096 })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  @MaxLength(4096)
  idToken: string;
}
```

### Query Param DTO (GET endpoints)

Query params arrive as strings — always coerce before validation.

```ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional, IsString, IsBoolean, IsIn,
  IsDateString, IsInt, IsNumber, Min, Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * QueryItemsDto
 *
 * Query parameters for GET /items.
 */
export class QueryItemsDto {
  // ── Date range ────────────────────────────────────────────────────────────

  @ApiProperty({ required: false, description: 'Start date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()                         // validates ISO date string format
  date_from?: string;

  @ApiProperty({ required: false, description: 'End date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  // ── Enum fields ───────────────────────────────────────────────────────────

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  // ── Integer query param ───────────────────────────────────────────────────

  @ApiProperty({ required: false, description: 'Items per page', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))  // coerce string → int
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  // ── Float/number query param ──────────────────────────────────────────────

  @ApiProperty({ required: false, description: 'Min amount filter' })
  @IsOptional()
  @Type(() => Number)                      // class-transformer coercion
  @IsNumber()
  @Min(0)
  min_amount?: number;

  // ── Boolean query param ───────────────────────────────────────────────────

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  include_deleted?: boolean = false;

  // ── Free-text string ──────────────────────────────────────────────────────

  @ApiProperty({ required: false, description: 'Search term' })
  @IsOptional()
  @IsString()
  q?: string;
}
```

### Response DTO (for Swagger `type:` annotation)

```ts
/**
 * ItemDto
 *
 * Swagger documentation shape for a single item in list responses.
 * The actual runtime type is the Item interface/Prisma type.
 */
export class ItemDto {
  @ApiProperty({ description: 'Item ID', example: 'cuid123' })
  id: string;

  @ApiProperty({ description: 'Item name' })
  name: string;

  @ApiProperty({ type: [String], description: 'Tags' })
  tags: string[];
}

// In controller:
@ApiResponse({ status: 200, description: 'Paginated items', type: [ItemDto] })
```

### DTO Rules

- `@ApiProperty` on **every** field — include `required`, `description`, `default`, `enum`, `example`.
- `@IsOptional()` must be the **first** decorator on every optional field.
- Integer params: `@Transform(({ value }) => parseInt(value, 10))` + `@IsInt()` + `@Min()` / `@Max()`.
- Float params: `@Type(() => Number)` + `@IsNumber()` + `@Min(0)` where applicable.
- Boolean params: `@Transform(({ value }) => value === 'true' || value === true)` + `@IsBoolean()`.
- Date params: `@IsDateString()` (not `@IsString()`). Document `YYYY-MM-DD` in the description.
- Enum params: `@IsIn([...])` + `enum: [...]` in `@ApiProperty`. Mirror as union literal type.
- `@MaxLength` on all free-text string **body** fields to prevent oversized payloads.
- Mirror `minLength`/`maxLength` in `@ApiProperty` when using `@MinLength`/`@MaxLength`.
- Assign defaults with `= value` on the property declaration, not just in `@ApiProperty`.
- No business logic in DTOs — they are pure data contracts.
- Group fields with `// ── Section ───` dividers when there are more than 3 fields.

---

## Repository Layer

The repository is the **only** place that touches Prisma.

```ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';

/**
 * UserRepository
 *
 * Thin data-access layer. All Prisma calls live here.
 * Services never import PrismaService directly.
 */
@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns null when no matching row exists.
   * Callers throw the appropriate HTTP exception.
   */
  async findByUid(uid: string): Promise<Pick<User, 'id' | 'email' | 'isActive'> | null> {
    return this.prisma.user.findUnique({
      where: { uid },
      select: { id: true, email: true, isActive: true },
    });
  }
}
```

Rules:
- **Return `null`**, not throw, when a record is not found; let the service throw the HTTP exception.
- Always use `select: { ... }` — only fetch columns actually needed.
- Use `Pick<Model, 'field1' | 'field2'>` as the return type; never define duplicate DB types.
- The Prisma schema is the single source of truth for DB types; import from `@prisma/client`.
- `private readonly logger = new Logger(ClassName.name)` on every class.

---

## Service Layer

```ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from 'src/<feature>/repository';
import { LoginDto } from 'src/<feature>/dto';

/**
 * AuthService
 *
 * Business logic for authentication flows.
 * Delegates all DB access to UserRepository.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly userRepository: UserRepository) {}

  // ─── Login ────────────────────────────────────────────────────────────────

  /**
   * Verifies credentials and returns a session token.
   *
   * @param dto - Login payload from the controller
   * @throws UnauthorizedException when credentials are invalid
   */
  async login(dto: LoginDto): Promise<{ message: string }> {
    const user = await this.userRepository.findByUid(dto.idToken);
    if (!user) throw new UnauthorizedException('Authentication failed');
    return { message: 'Login successful' };
  }
}
```

Rules:
- Inject the repository, never `PrismaService`.
- Throw NestJS HTTP exceptions (`UnauthorizedException`, `ConflictException`, etc.) here.
- Use `// ─── Section ───` dividers between logical method groups.
- JSDoc block on every public method with `@param`, `@throws`, `@returns`.
- `private readonly logger = new Logger(ClassName.name)` on every class.

---

## Layered Service Pattern

When a feature has complex, multi-step processing, split it into focused single-responsibility
`@Injectable()` **layers** under `service/core/`. Each layer handles one concern.

```
service/
├── <role>/
│   └── <role>-<feature>.orchestrator.ts   ← top-level: coordinates layers, owns locks
└── core/
    ├── safety.layer.ts                     ← rate limits, lock acquire/release
    ├── intent.layer.ts                     ← intent classification
    ├── extractor.layer.ts                  ← field/data extraction
    ├── response-parser.layer.ts            ← reply formatting, session save
    └── utility/
        ├── session/                        ← session CRUD
        ├── llm/                            ← LLM provider abstraction
        └── <other-utility>/
```

Layer naming: `<name>.layer.ts` → class `NameLayer`.

Rules:
- Each layer has **one** public method or a small cohesive set.
- Layers never call each other directly — the orchestrator wires them.
- The orchestrator's constructor lists every layer in order of concern
  (safety → intent → extraction → response), making the pipeline self-documenting.
- Log every state transition from the orchestrator with a structured `logTransition()` helper.

```ts
private logTransition(params: {
  userId: string;
  from: string;
  to: string;
  turn?: number;
  llmCalled?: boolean;
  latencyMs?: number;
}): void {
  this.logger.log(
    JSON.stringify({
      event: 'state_transition',
      userId: params.userId.substring(0, 8) + '***', // never log full userId
      from: params.from,
      to: params.to,
      turn: params.turn ?? null,
      llmCalled: params.llmCalled ?? false,
      latencyMs: params.latencyMs ?? null,
      ts: new Date().toISOString(),
    }),
  );
}
```

---

## Orchestrator Pattern

An orchestrator is the single entry-point for a feature's top-level operations. It:
1. Acquires a session/concurrency lock via the safety layer.
2. Checks rate-limit / budget.
3. Routes to the correct handler (state machine branch or intent switch).
4. Releases the lock in `finally {}`.

```ts
async processRequest(userId: string, dto: RequestDto): Promise<Response> {
  const lockToken = await this.safety.acquireLock(userId);
  if (!lockToken) {
    return this.responseParser.buildResponse('Still processing, please wait...');
  }

  try {
    const withinBudget = await this.safety.checkBudget(userId);
    if (!withinBudget) { /* return limit message */ }

    // ... main logic with switch/if-branches per state
    switch (intentResult.intent) {
      case 'CREATE': return this.handleCreate(...);
      case 'UPDATE': return this.handleUpdate(...);
    }
  } finally {
    await this.safety.releaseLock(userId, lockToken);  // ALWAYS release
  }
}
```

Rules:
- **Always** release the lock in `finally {}` — never trust early returns.
- Emit structured SSE events at each stage for streaming features.
- Never let the orchestrator talk to Prisma directly for business data.

---

## Registry Pattern

Use a `Registry` class implementing `OnApplicationBootstrap` when you need to
dynamically register capabilities (tools, handlers, routes) at startup.

```ts
@Injectable()
export class ToolRegistry implements OnApplicationBootstrap {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, ToolDefinition>();
  private catalogueCache: string | null = null;  // invalidated on register()

  onApplicationBootstrap() {
    this.logger.log('Initializing ToolRegistry…');
    // Register tools here
    this.register({ id: 'items.list', description: '…', execute: async (userId, params) => {} });
    this.logger.log(`ToolRegistry initialized with ${this.getToolCount()} tools.`);
  }

  register(tool: ToolDefinition) {
    if (this.tools.has(tool.id)) {
      this.logger.warn(`Tool "${tool.id}" already registered. Overwriting.`);
    }
    this.tools.set(tool.id, tool);
    this.catalogueCache = null;  // invalidate cache on every new registration
  }

  getToolCount() { return this.tools.size; }
}
```

Rules:
- Implement `OnApplicationBootstrap` (not `OnModuleInit`) for registry setup.
- Use a `Map<string, Definition>` as the internal store.
- Cache computed catalogue strings and invalidate on `register()`.
- Hallucination guard: filter LLM-generated IDs against the live registry before use.
- The `execute()` method is the single callable interface — callers never access the Map directly.

---

## Controller Layer

### Standard controller (per-route guard)

```ts
import { Controller, Post, Body, Get, Query, HttpCode, HttpStatus, UseGuards, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FeatureService } from '../service';
import { CreateDto, QueryItemsDto, ItemDto } from '../dto';
import { AuthGuard } from '../guard';
import { GetUser } from '../decorator';

/**
 * FeatureController
 *
 * Exposes CRUD endpoints for <feature>. Delegates all logic to FeatureService.
 */
@ApiTags('Feature')
@Controller('feature')
export class FeatureController {
  private readonly logger = new Logger(FeatureController.name);

  constructor(private readonly featureService: FeatureService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new item' })
  @ApiResponse({ status: 200, description: 'Item created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @GetUser('dbId') userId: string,
    @Body() dto: CreateDto,
  ) {
    return this.featureService.create(userId, dto);
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List items with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated item list', type: [ItemDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(
    @GetUser('dbId') userId: string,
    @Query() query: QueryItemsDto,
  ) {
    return this.featureService.list(userId, query);
  }
}
```

### Fully-guarded controller (class-level guard + bearer)

When **every** endpoint in a controller requires authentication, apply `@UseGuards` and
`@ApiBearerAuth` at the **class level** to avoid repetition on each method.

```ts
@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard)              // ← class-level: applies to ALL methods
@ApiBearerAuth()                   // ← class-level: Swagger shows lock on all
export class DashboardController {
  @Get('summary')
  @ApiOperation({ summary: 'Get KPI summary' })
  @ApiResponse({ status: 200, description: 'Returns top-level KPIs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSummary(@GetUser('dbId') userId: string) {
    return this.service.getSummary(userId);
  }
}
```

### Tenant-scoped endpoint (multi-tenancy via header)

When your app supports multi-tenancy via a request header, extract and null-coalesce it.
The specific header name (`x-org-id`, `x-tenant-id`, etc.) is project-defined — see your project's
extension rules. The generic pattern:

```ts
async getItems(
  @GetUser('dbId') userId: string,
  @Query() query: QueryItemsDto,
  @Headers('<your-tenant-header>') tenantId?: string,  // ← project-specific header name
) {
  return this.service.getItems(userId, query, tenantId ?? null);  // null = personal context
}
```

See the project extension file (`RULE-project.md`) for the actual header name and full tenant-scoping rules.

### Controller Rules

- Inject **services only** — never repositories or PrismaService.
- `@ApiTags('FeatureName')` on every controller class (never per-method).
- `@ApiBearerAuth()` on **class** when all methods require auth; on **method** otherwise.
- `@UseGuards(...)` on **class** when all methods share the same guard chain.
- `@ApiOperation({ summary: '...' })` on every method — one-line human-readable summary.
- `@ApiResponse` for **every** distinct HTTP status the endpoint can return:
  - `200` — success with `description` of what's returned.
  - `400` — validation errors (when DTO can fail).
  - `401` — unauthorized (when behind auth guard).
  - `403` — forbidden (when behind RBAC guard).
  - Include `type: [ResponseDto]` in the 200 `@ApiResponse` when returning a typed array.
- `@HttpCode(HttpStatus.OK)` on POST endpoints returning 200 (NestJS default is 201).
- If your project uses multi-tenancy: extract the tenant header and pass `tenantId ?? null` to the service (see project extension file for the header name).
- `@GetUser('dbId')` to extract the authenticated user's DB id.
- Use `// ─── Section ───` dividers between endpoint groups.
- Multi-controller modules: split by role into separate files, all registered in the module.

---

## Guard Layer

```ts
/**
 * RbacGuard
 *
 * Permission-checking guard for multi-role routes.
 * Must always be chained AFTER the auth guard — it reads `request.user`
 * which the auth guard populates.
 *
 * Flow:
 *  1. Read @RequirePermissions() metadata from the route handler.
 *  2. If no metadata → route is unprotected → fail-closed (throw ForbiddenException).
 *  3. If @PublicRoute() → return true (no RBAC check, but still authenticated).
 *  4. If user is super admin → bypass all checks → return true.
 *  5. Delegate to RbacService.userHasPermissions().
 */
@Injectable()
export class RbacGuard implements CanActivate {
  // ...
}
```

Rules:
- `/** [SECURITY] ... */` comment on every security decision inside guards.
- Class JSDoc must enumerate the verification sequence as a numbered list.
- Attach verified payload to `request.<entity>` (e.g. `request.user`).
- Cross-validate IDs that appear in both headers and URL params to prevent IDOR attacks.
- Never register guards globally unless intentional — document the reason if you do.
- Guard ordering matters: JWT/auth guard first, RBAC guard second.

---

## Decorator Layer

```ts
// decorator/get-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @GetUser()
 *
 * Parameter decorator that returns the authenticated user object (or a
 * specific field from it) that the auth guard attached to the request.
 *
 * Usage:
 * ```ts
 * getMe(@GetUser() user: AuthenticatedUser) { ... }
 * delete(@GetUser('dbId') userId: string) { ... }
 * ```
 *
 * Must only be used on routes protected by the auth guard.
 */
export const GetUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (field) return user?.[field];
    return user;
  },
);
```

```ts
// decorator/public-route.decorator.ts
/** [SECURITY] Mark a route as intentionally public within the auth guard chain.
 *  Guards using fail-closed RBAC will throw ForbiddenException if neither
 *  @RequirePermissions nor @PublicRoute is present. Use @PublicRoute() to
 *  explicitly bypass RBAC while still requiring authentication. */
export const IS_PUBLIC_ROUTE_KEY = 'isPublicRoute';
export const PublicRoute = () => SetMetadata(IS_PUBLIC_ROUTE_KEY, true);
```

```ts
// decorator/require-permissions.decorator.ts
/**
 * @RequirePermissions('item:read', 'item:create')
 *
 * AND logic: the user must have ALL listed permissions.
 * For OR logic, use separate route handlers.
 */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

Rules:
- Every decorator file exports its metadata key constant alongside the decorator factory.
- Usage example in JSDoc with `ts` fenced code block.
- `[SECURITY]` comment when the decorator participates in the auth/RBAC chain.

---

## Exception Layer

```ts
// exceptions/payment-required.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * PaymentRequiredException
 *
 * Thrown when a user tries to access a feature blocked by their plan tier.
 * Uses HTTP 402 Payment Required.
 */
export class PaymentRequiredException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}
```

Rules:
- Create custom exception classes for domain-specific HTTP statuses (402, 429, etc.).
- Always extend `HttpException` — never `Error` directly.
- One class per file, file named `<name>.exception.ts`.
- Export from `exceptions/index.ts`.

---

## Helpers Layer

Helpers are **plain exported functions** — not `@Injectable()` classes. Use them for
stateless utilities that need no NestJS DI context.

```ts
// helpers/atomic-rate-limit.helper.ts
/**
 * atomicRateLimitIncr
 *
 * [SECURITY] Fully atomic rate-limit increment via Lua script.
 *
 * The naive 3-command approach (GET → check → INCR + EXPIRE) has a TOCTOU window:
 * if the process crashes between INCR and EXPIRE, the key persists with no TTL,
 * permanently locking the client.
 *
 * This Lua script is a single atomic Redis command — no crash window.
 *
 * @param redis      - ioredis client
 * @param key        - Redis key for the rate limit counter
 * @param ttlSeconds - TTL in seconds for the rate limit window
 * @returns new count after increment
 */
export async function atomicRateLimitIncr(
  redis: Redis,
  key: string,
  ttlSeconds: number,
): Promise<number> {
  const result = await redis.eval(ATOMIC_RATE_LIMIT_LUA, 1, key, String(ttlSeconds));
  return result as number;
}
```

Rules:
- Module-level JSDoc explaining the rationale and why simpler approaches were rejected.
- `@param` and `@returns` on every function.
- `[SECURITY]` comments on inline decisions within the function body.
- Import helpers from their `index.ts` barrel.

---

## Provider Layer (Redis & external clients)

Use a `Provider` factory object for any external client that needs connection lifecycle
management and logging.

```ts
// providers/feature-redis.provider.ts
import { Logger, Provider } from '@nestjs/common';
import { Redis } from 'ioredis';
import { FeatureRedisConfig } from '../config';

export const FEATURE_REDIS_CLIENT = 'FEATURE_REDIS_CLIENT';  // injection token

const redisLogger = new Logger('FeatureRedis');

export const FeatureRedisProvider: Provider = {
  provide: FEATURE_REDIS_CLIENT,
  useFactory: (config: FeatureRedisConfig) => {
    const client = new Redis({
      ...config.getRedisConfig(),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 500, 30_000);  // exponential backoff, max 30s
        redisLogger.warn(`Redis reconnect attempt #${times}, retrying in ${delay}ms`);
        return delay;
      },
      lazyConnect: false,
    });

    client.on('error',       (err) => redisLogger.error(`Redis error: ${err.message}`, err.stack));
    client.on('connect',     ()    => redisLogger.log('Redis connected'));
    client.on('reconnecting',()    => redisLogger.warn('Redis reconnecting…'));
    client.on('ready',       ()    => redisLogger.log('Redis ready'));

    return client;
  },
  inject: [FeatureRedisConfig],
};
```

Rules:
- Export the **injection token constant** from the same file — `@Inject(FEATURE_REDIS_CLIENT)` in constructors.
- Always attach `error`, `connect`, `reconnecting`, and `ready` event listeners.
- Exponential backoff in `retryStrategy` — cap at 30 seconds.
- Each module that needs its own Redis connection gets its own provider file and token.
- Register the config class AND the provider in `providers: []` — config first (it's a dependency).

---

## Module Registration

```ts
/**
 * FeatureModule
 *
 * Provides the <feature> domain:
 *  - AuthGuard       – Bearer JWT verification
 *  - RbacGuard       – Permission-based route protection
 *  - FeatureService  – Business logic
 *  - FeatureRepo     – DB access layer
 *
 * No need to import PrismaModule (global) or CacheModule (global).
 */
@Module({
  imports: [ConfigModule, EmailModule],
  controllers: [FeatureController],
  providers: [
    FeatureRedisConfig,    // must be before FeatureRedisProvider (inject dep)
    FeatureRedisProvider,  // factory provider
    AuthGuard,
    RbacGuard,
    FeatureService,
    FeatureRepository,
  ],
  exports: [
    FEATURE_REDIS_CLIENT,  // export the token, not the provider object
    AuthGuard,
    RbacGuard,
    FeatureService,
  ],
})
export class FeatureModule {}
```

Rules:
- Module JSDoc lists every major provided service with a one-line description.
- Note intentionally omitted imports (e.g. `// No need to import PrismaModule (global)`).
- Export the **injection token** (`FEATURE_REDIS_CLIENT`), not the provider factory.
- Inline comments in `providers: []` explain what each provider does.
- Import `<Feature>Module` in `app.module.ts` from the root barrel: `import { FeatureModule } from './feature'`.

---

## Security Comment Discipline

Security-sensitive code **must** carry `[SECURITY]` inline comments. These are not optional.
The comment explains:
1. What attack or failure mode the code prevents.
2. What would happen without this guard.
3. Why this specific implementation was chosen over simpler alternatives.

### Format

```ts
/** [SECURITY] One-sentence description of the attack prevented.
 *  Without this: explanation of the failure mode.
 *  Implementation note: why this specific approach. */
```

### Where `[SECURITY]` comments are required

| Location | Example |
|---|---|
| File-level allow-lists | Path exemptions in guard middleware |
| Constructor body | Reading env vars instead of hardcoding |
| Inside `canActivate()` | Every check: token extraction, revocation cache |
| New user auto-creation | Race condition (duplicate key) handling |
| Unverified identity linking | ATO (Account Takeover) prevention |
| Rate limit logic | Why rate limiting is on by default |
| Cache key construction | Hash rationale, collision prevention |
| Revocation cache TTL | Why the specific duration was chosen |
| Audit helpers | What NOT to store (tokens, passwords, raw headers) |
| RBAC fail-closed | Why throwing when no permission metadata |
| IDOR prevention | Cross-validating IDs in header vs URL params |

### Concrete examples

```ts
/** [SECURITY] Use req.ip resolved by Express trust proxy (set to 1 in main.ts).
 *  Do NOT read x-forwarded-for directly — it can be spoofed by the client
 *  to bypass rate limiting by rotating a fake IP on every request. */
const ip = request.ip ?? 'unknown';
```

```ts
/** [SECURITY] Prevent zero-click Account Takeover (ATO).
 *  Do not link an unverified identity to an existing database user.
 *  An attacker can create a provider account asserting any email and
 *  hijack the victim's access if we skip this check. */
if (!decodedToken.email_verified) {
  throw new UnauthorizedException('Email verification required.');
}
```

```ts
/** [SECURITY] Wrap createUser in try/catch for P2002 (unique constraint).
 *  Two parallel first-login requests can both read null then both call createUser.
 *  The second insert hits the unique constraint — re-fetch the winning request's row
 *  instead of crashing with 500. */
try {
  dbUser = await this.userRepository.createUser({ ... });
} catch (err: any) {
  if (err?.code === 'P2002') {
    dbUser = await this.userRepository.findByUid(uid);
  } else {
    throw err;
  }
}
```

---

## JSDoc Rules

Every class and every public method must have a JSDoc block.

```ts
/**
 * ClassName
 *
 * One sentence what it does.
 * Security notes, guard chain position, constraints.
 *
 * Flow (for complex guards/orchestrators):
 *  1. Step one
 *  2. Step two
 *  3. Step three
 */

/**
 * Short description of what the method does.
 *
 * @param paramName - What it represents
 * @throws UnauthorizedException when ...
 * @returns What it returns
 */
```

Rules:
- Class JSDoc: always include a "Flow:" numbered list for guards and orchestrators.
- Method JSDoc: `@param`, `@throws`, `@returns`.
- Parameter decorators: include usage example with `ts` fenced code block.
- Private methods that encode non-obvious decisions must have a JSDoc explaining why.

---

## Section Dividers

Use section dividers inside all files longer than ~50 lines. Two styles:

```ts
// ─── Section Name ─────────────────────────────────────────────────────────────
// Used in: service files, repository files, type files, config files

// ── Subsection ──────────────────────────────────────────────────────────────
// Used in: config constant objects, type definition groups
```

Inline branch comments in orchestrators:

```ts
// ── BRANCH: UPDATING state ──────────────────────────────────────────────────
if (session.state === 'UPDATING') { ... }

// ── LAYER 0: Regex intent detection ─────────────────────────────────────────
if (this.extractor.isConfirmation(msg)) { ... }
```

---

## Zod Validation

Use Zod for validating LLM outputs, external API responses, and any data that crosses
a trust boundary (not controlled by `class-validator`).

```ts
// Co-locate schema with the interface in types/<feature>.types.ts

export const IntentResultSchema = z.object({
  intent: z.enum(['CREATE', 'UPDATE', 'DELETE', 'QUERY', 'GENERAL']),
  confidence: z.number().optional(),
});

export type IntentResult = z.infer<typeof IntentResultSchema>;

// In the service:
const parsed = IntentResultSchema.parse(rawLlmResponse);  // throws ZodError on invalid
```

Always run a hallucination guard after parsing LLM output:

```ts
const validSteps = parsedPlan.steps.filter((step) => {
  const exists = this.registry.hasTool(step.toolId);
  if (!exists) {
    this.logger.warn(`LLM hallucinated toolId "${step.toolId}". Skipping.`);
  }
  return exists;
});
```

Rules:
- Pre-process LLM params before Zod parse (e.g. JSON.parse string → object, delete null values).
- Catch Zod errors explicitly and return safe fallback values so one bad LLM response doesn't crash.
- Hallucination guard: filter steps referencing non-existent IDs in your registry/schema.

---

## Redis Key Registry

**All** Redis key prefixes for a module must be defined in a single `constants/redis-keys.ts` file.
Never hardcode key prefix strings inline in guards, services, or processors.

```ts
// constants/redis-keys.ts
/**
 * REDIS_KEYS — Central registry of all Redis key prefixes.
 *
 * [SECURITY] All Redis key prefixes MUST be defined here.
 * Do NOT hardcode key prefix strings in guard, service, or processor files.
 *
 * Rationale: A single file makes it trivial to audit all key namespaces.
 * Without a registry, conflicting prefixes can cause cache key collisions.
 *
 * Key format conventions:
 * - All prefixes end with ':' so the full key is `PREFIX + uniquePart`.
 * - Prefixes must be unique at the first segment (before the first ':').
 */
export const REDIS_KEYS = {
  /** token_ok:<sha256-hex>
   *  Set by: AuthGuard (revocation check cache)
   *  TTL: 5 seconds */
  REVOCATION_CACHE: 'token_ok:',

  /** otp:<userId>
   *  Set by: OtpService.generate
   *  TTL: configured OTP_TTL_SECONDS */
  OTP: 'otp:',

  /** rate_limit:<scope>:<identifier>
   *  Set by: atomicRateLimitIncr
   *  TTL: caller-specified window */
  RATE_LIMIT: 'rate_limit:',

  /** lock:<scope>:<userId>
   *  Set by: safety layer acquireLock
   *  TTL: 60 seconds */
  SESSION_LOCK: 'lock:',
} as const;
```

Every entry must document:
- Full key format (with example dynamic part)
- Who sets it / who consumes it
- TTL

---

## Fire-and-Forget Pattern

Use fire-and-forget for side effects that must never block the main request path
(audit logs, timestamp updates, cleanup jobs).

```ts
// helpers/audit.helper.ts

/**
 * writeAuditLog
 *
 * [SECURITY] Fire-and-forget audit log writer.
 *
 * IMPORTANT: This function does NOT throw. Audit failures must never
 * block the main flow. Always call without await or with .catch().
 *
 * DO NOT store: tokens, passwords, OTP values, reset links, raw headers.
 *
 * @param userId - DB id of the user, or null for unauthenticated events
 */
export function writeAuditLog(
  prisma: PrismaService,
  action: AuditAction,
  /** [SECURITY] userId may be null for unauthenticated events.
   *  Pass null — do NOT pass 'anonymous'. Using a fake string causes a P2003
   *  FK constraint error that silently swallows every audit write. */
  userId: string | null,
  metadata: { ip?: string; path?: string; reason?: string },
): void {
  prisma.auditLog
    .create({
      data: {
        ...(userId ? { user_id: userId } : {}),  // conditional connect
        action,
        metadata: { ip: metadata.ip ?? 'unknown' },
      },
    })
    .catch((err) => {
      logger.error(`Failed to write audit log [${action}]`, err);
    });
  // No return — intentionally void
}
```

```ts
// In a service — fire-and-forget background work
/** [SECURITY] Stamp lastLoginAt — fire-and-forget. Must not block auth. */
this.userRepository.stampLastLogin(dbUser.id).catch((err) => {
  this.logger.error('Failed to stamp lastLoginAt', err);
});
```

Rules:
- Return type is `void` (not `Promise<void>`) — signals intentional fire-and-forget.
- Chain `.catch()` — never let a floating promise produce an unhandled rejection.
- `[SECURITY]` comment on every field explaining what NOT to store.
- Null userId: use conditional Prisma connect to avoid FK constraint errors.

---

## Atomic Redis Operations

Any Redis operation that requires "increment + set TTL" in a single unit must use a Lua script.
Never use separate `INCR` + `EXPIRE` commands — they have a TOCTOU crash window.

```ts
// helpers/atomic-rate-limit.helper.ts

/**
 * [SECURITY] Single atomic Lua script — no TOCTOU crash window.
 *
 * Without this: if the process crashes between INCR and EXPIRE, the key
 * persists forever with no TTL, permanently locking the client.
 */
const ATOMIC_RATE_LIMIT_LUA = `
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local current = redis.call('GET', key)
if not current then
  redis.call('SET', key, '1', 'EX', ttl)
  return 1
end
local remaining = redis.call('TTL', key)
if remaining == -1 then
  redis.call('EXPIRE', key, ttl)   -- repair orphaned key (no TTL)
end
return redis.call('INCR', key)
`;

await redis.eval(ATOMIC_RATE_LIMIT_LUA, 1, key, String(ttlSeconds));
```

Lock acquire/release pattern (compare-and-delete):

```ts
// Acquire: SET NX EX
const result = await redis.set(`lock:${scope}:${userId}`, token, 'EX', 60, 'NX');
return result === 'OK' ? token : null;

// Release: Lua compare-and-delete (prevents releasing someone else's lock)
const LUA_RELEASE = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;
await redis.eval(LUA_RELEASE, 1, `lock:${scope}:${userId}`, token);
```

Rules:
- Document the Lua script with a `[SECURITY]` comment explaining the TOCTOU problem it solves.
- Lock tokens: use `uuidv4()` not incrementing integers.
- Fail-open vs fail-closed: **non-critical guards** (rate-limit counters, caches) should fail-open — log a warning and continue so a Redis outage does not block legitimate requests. **Financial or write locks** must fail-closed — throw and reject the request rather than risk concurrent mutations.

---

## SSE / Streaming Pattern

Use `Subject<MessageEvent>` from RxJS and NestJS `@Sse()` for server-sent events.

```ts
// Controller
@Sse('stream')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Stream processing events' })
streamProcess(
  @GetUser('dbId') userId: string,
  @Body() dto: ProcessDto,
): Observable<MessageEvent> {
  const subject = new Subject<MessageEvent>();
  this.orchestratorService.process(userId, dto, subject)
    .catch((err) => {
      this.logger.error('Stream failed', err);
      subject.next({ type: 'error', data: { message: 'Unexpected error' } } as any);
      subject.complete();
    });
  return subject.asObservable();
}

// Orchestrator emits typed events
subject.next({ type: 'planning',      data: { message: 'Planning…' } });
subject.next({ type: 'step_start',    data: { stepId: 's1', description: '…' } });
subject.next({ type: 'step_complete', data: { stepId: 's1', success: true, durationMs: 120 } });
subject.next({ type: 'result',        data: result });
// Always complete in finally:
subject.complete();
```

Rules:
- `subject.complete()` must be called in `finally {}` of the orchestrator.
- Define an exhaustive set of typed event types; never emit raw untyped objects.

---

## Quick Checklist (new feature)

### Structure
- [ ] Create `src/<feature>/` folder
- [ ] Add `<feature>.module.ts` with providers, controllers, exports and a JSDoc summary
- [ ] Add root `index.ts` → `export * from './<feature>.module'`
- [ ] Add only the sub-folders your feature actually needs

### Layers
- [ ] `controller/`: inject services only, `@ApiOperation` + `@ApiResponse` on every endpoint
- [ ] `service/<role>/`: inject repositories, throw HTTP exceptions, JSDoc on every method
- [ ] `repository/<role>/`: Prisma only, `select` only needed columns, return `null` not throw
- [ ] `dto/`: `@ApiProperty` on every field (with `required`, `description`, `default`, `enum`, `example`)
- [ ] `types/`: JSDoc on every field, Zod schemas co-located, section dividers
- [ ] `config/`: typed `@Injectable` class for env vars, `as const` object for static constants
- [ ] `constants/`: SCREAMING_SNAKE `as const` objects + derived union types + section dividers
- [ ] `guard/`: implements `CanActivate`, numbered flow in JSDoc, `[SECURITY]` on every decision
- [ ] `decorator/`: exports metadata key alongside decorator, usage example in JSDoc
- [ ] `exceptions/`: extends `HttpException`, one class per file
- [ ] `helpers/`: plain exported functions, module-level JSDoc with rationale
- [ ] `providers/`: exports injection token constant, attaches all Redis event listeners

### DTO (Query Param specifics)
- [ ] Query-param DTOs named `Query<Feature>Dto` — all fields `@IsOptional()` with defaults
- [ ] `@IsOptional()` is the **first** decorator on every optional field
- [ ] Integer params: `@Transform(({ value }) => parseInt(value, 10))` + `@IsInt()` + `@Min()` / `@Max()`
- [ ] Float params: `@Type(() => Number)` + `@IsNumber()` + `@Min(0)` where applicable
- [ ] Boolean params: `@Transform(({ value }) => value === 'true' || value === true)` + `@IsBoolean()`
- [ ] Date params: `@IsDateString()`, description includes `YYYY-MM-DD`
- [ ] Enum params: `@IsIn([...])` + `enum: [...]` in `@ApiProperty`, union literal type
- [ ] Response DTOs: `<Name>Dto` class with `@ApiProperty` on all fields when returning arrays

### Controller
- [ ] `@ApiTags('FeatureName')` on every controller class
- [ ] `@ApiBearerAuth()` on **class** when all methods require auth
- [ ] `@UseGuards(AuthGuard)` on **class** when all methods share the guard
- [ ] `@ApiOperation({ summary: '...' })` on every handler method
- [ ] `@ApiResponse` for every distinct HTTP status: 200, 400, 401, 403
- [ ] `type: [ResponseDto]` in `@ApiResponse` when returning a typed array
- [ ] If using multi-tenancy: extract the tenant header per project conventions → `tenantId ?? null` to service
- [ ] `@GetUser('dbId') userId: string` to extract the authenticated user's DB id
- [ ] `@HttpCode(HttpStatus.OK)` on POST endpoints that return 200
- [ ] `// ─── Section ───` dividers between endpoint groups

### Redis
- [ ] Define all key prefixes in `constants/redis-keys.ts` with Set/Consumed/TTL docs
- [ ] Use Lua scripts for any increment+TTL or compare-and-delete operation
- [ ] Use `uuidv4()` lock tokens for concurrency locks; compare-and-delete on release
- [ ] **Fail-open** (log + proceed) only for non-critical guards (e.g. rate-limit counters, caches) where a Redis outage should not block legitimate requests
- [ ] **Fail-closed** (throw + block) for write locks on financial/critical data — a Redis outage must not allow concurrent mutations

### Security
- [ ] `[SECURITY]` comment on every trust-boundary check, path allow-list, cache key construction
- [ ] IP from `request.ip` (trust proxy), never from `x-forwarded-for` directly
- [ ] Rate limit enabled by env var (e.g. `RATE_LIMIT_ENABLED=true`), not `NODE_ENV`
- [ ] Token cache keys use SHA-256 hash of the full token, not a substring
- [ ] Null userId in audit writes: conditional Prisma connect, never pass fake string
- [ ] ATO check: never link unverified identity to an existing DB user
- [ ] IDOR check: cross-validate org/tenant ID in header against URL params in RBAC guard
- [ ] Fail-closed RBAC: every guarded route needs `@RequirePermissions()` or `@PublicRoute()`

### Layered / Orchestrated features
- [ ] Split into `layers` (single-concern `@Injectable()`) under `service/core/`
- [ ] Orchestrator acquires lock → checks budget → routes intent → releases lock in `finally {}`
- [ ] Log every state transition with `logTransition()` (truncated userId: first 8 chars + ***)
- [ ] Zod validate + hallucination-guard all LLM outputs before use
- [ ] Registry implements `OnApplicationBootstrap`, uses `Map<string, Definition>`, invalidates cache on `register()`

### General
- [ ] `private readonly logger = new Logger(ClassName.name)` on every class
- [ ] Import from barrel (`'../service'` not `'../service/admin/admin-feature.service'`)
- [ ] Cross-module imports use `src/` alias, not relative `../../`
- [ ] Fire-and-forget side effects: `.catch()` on floating promises, never `await`
- [ ] Register `<Feature>Module` in `app.module.ts` via the root barrel
