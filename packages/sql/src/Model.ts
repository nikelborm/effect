/**
 * @since 1.0.0
 */
import * as RRX from "@effect/experimental/RequestResolver"
import * as VariantSchema from "@effect/experimental/VariantSchema"
import type { Brand } from "effect/Brand"
import * as DateTime from "effect/DateTime"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import * as Uuid from "uuid"
import { SqlClient } from "./SqlClient.js"
import * as SqlResolver from "./SqlResolver.js"
import * as SqlSchema from "./SqlSchema.js"

const {
  Class,
  Field,
  FieldExcept,
  FieldOnly,
  Struct,
  Union,
  extract,
  fieldEvolve,
  fieldFromKey
} = VariantSchema.make({
  variants: ["select", "insert", "update", "json", "jsonCreate", "jsonUpdate"],
  defaultVariant: "select"
})

/**
 * @since 1.0.0
 * @category models
 */
export type Any = Schema.Schema.Any & {
  readonly fields: Schema.Struct.Fields
  readonly insert: Schema.Schema.Any
  readonly update: Schema.Schema.Any
  readonly json: Schema.Schema.Any
  readonly jsonCreate: Schema.Schema.Any
  readonly jsonUpdate: Schema.Schema.Any
}

/**
 * @since 1.0.0
 * @category models
 */
export type AnyNoContext = Schema.Schema.AnyNoContext & {
  readonly fields: Schema.Struct.Fields
  readonly insert: Schema.Schema.AnyNoContext
  readonly update: Schema.Schema.AnyNoContext
  readonly json: Schema.Schema.AnyNoContext
  readonly jsonCreate: Schema.Schema.AnyNoContext
  readonly jsonUpdate: Schema.Schema.AnyNoContext
}

/**
 * @since 1.0.0
 * @category models
 */
export type VariantsDatabase = "select" | "insert" | "update"

/**
 * @since 1.0.0
 * @category models
 */
export type VariantsJson = "json" | "jsonCreate" | "jsonUpdate"

export {
  /**
   * A base class used for creating domain model schemas.
   *
   * It supports common variants for database and JSON apis.
   *
   * @since 1.0.0
   * @category constructors
   * @example
   * ```ts
   * import { Schema } from "effect"
   * import { Model } from "@effect/sql"
   *
   * export const GroupId = Schema.Number.pipe(Schema.brand("GroupId"))
   *
   * export class Group extends Model.Class<Group>("Group")({
   *   id: Model.Generated(GroupId),
   *   name: Schema.NonEmptyTrimmedString,
   *   createdAt: Model.DateTimeInsertFromDate,
   *   updatedAt: Model.DateTimeUpdateFromDate
   * }) {}
   *
   * // schema used for selects
   * Group
   *
   * // schema used for inserts
   * Group.insert
   *
   * // schema used for updates
   * Group.update
   *
   * // schema used for json api
   * Group.json
   * Group.jsonCreate
   * Group.jsonUpdate
   *
   * // you can also turn them into classes
   * class GroupJson extends Schema.Class<GroupJson>("GroupJson")(Group.json) {
   *   get upperName() {
   *     return this.name.toUpperCase()
   *   }
   * }
   * ```
   */
  Class,
  /**
   * @since 1.0.0
   * @category extraction
   */
  extract,
  /**
   * @since 1.0.0
   * @category fields
   */
  Field,
  /**
   * @since 1.0.0
   * @category fields
   */
  fieldEvolve,
  /**
   * @since 1.0.0
   * @category fields
   */
  FieldExcept,
  /**
   * @since 1.0.0
   * @category fields
   */
  fieldFromKey,
  /**
   * @since 1.0.0
   * @category fields
   */
  FieldOnly,
  /**
   * @since 1.0.0
   * @category constructors
   */
  Struct,
  /**
   * @since 1.0.0
   * @category constructors
   */
  Union
}

/**
 * @since 1.0.0
 * @category fields
 */
export const fields: <A extends VariantSchema.Struct<any>>(self: A) => A[VariantSchema.TypeId] = VariantSchema.fields

/**
 * @since 1.0.0
 * @category overrideable
 */
export const Override: <A>(value: A) => A & Brand<"Override"> = VariantSchema.Override

/**
 * @since 1.0.0
 * @category generated
 */
export interface Generated<S extends Schema.Schema.All | Schema.PropertySignature.All> extends
  VariantSchema.Field<{
    readonly select: S
    readonly update: S
    readonly json: S
  }>
{}

/**
 * A field that represents a column that is generated by the database.
 *
 * It is available for selection and update, but not for insertion.
 *
 * @since 1.0.0
 * @category generated
 */
export const Generated = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
  schema: S
): Generated<S> =>
  Field({
    select: schema,
    update: schema,
    json: schema
  })

/**
 * @since 1.0.0
 * @category generated
 */
export interface GeneratedByApp<S extends Schema.Schema.All | Schema.PropertySignature.All>
  extends
    VariantSchema.Field<{
      readonly select: S
      readonly insert: S
      readonly update: S
      readonly json: S
    }>
{}

/**
 * A field that represents a column that is generated by the application.
 *
 * It is required by the database, but not by the JSON variants.
 *
 * @since 1.0.0
 * @category generated
 */
export const GeneratedByApp = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
  schema: S
): GeneratedByApp<S> =>
  Field({
    select: schema,
    insert: schema,
    update: schema,
    json: schema
  })

/**
 * @since 1.0.0
 * @category sensitive
 */
export interface Sensitive<S extends Schema.Schema.All | Schema.PropertySignature.All> extends
  VariantSchema.Field<{
    readonly select: S
    readonly insert: S
    readonly update: S
  }>
{}

/**
 * A field that represents a sensitive value that should not be exposed in the
 * JSON variants.
 *
 * @since 1.0.0
 * @category sensitive
 */
export const Sensitive = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
  schema: S
): Sensitive<S> =>
  Field({
    select: schema,
    insert: schema,
    update: schema
  })

/**
 * Convert a field to one that is optional for all variants.
 *
 * For the database variants, it will accept `null`able values.
 * For the JSON variants, it will also accept missing keys.
 *
 * @since 1.0.0
 * @category optional
 */
export interface FieldOption<S extends Schema.Schema.Any> extends
  VariantSchema.Field<{
    readonly select: Schema.OptionFromNullOr<S>
    readonly insert: Schema.OptionFromNullOr<S>
    readonly update: Schema.OptionFromNullOr<S>
    readonly json: Schema.optionalWith<S, { as: "Option" }>
    readonly jsonCreate: Schema.optionalWith<S, { as: "Option"; nullable: true }>
    readonly jsonUpdate: Schema.optionalWith<S, { as: "Option"; nullable: true }>
  }>
{}

/**
 * Convert a field to one that is optional for all variants.
 *
 * For the database variants, it will accept `null`able values.
 * For the JSON variants, it will also accept missing keys.
 *
 * @since 1.0.0
 * @category optional
 */
export const FieldOption: <Field extends VariantSchema.Field<any> | Schema.Schema.Any>(
  self: Field
) => Field extends Schema.Schema.Any ? FieldOption<Field>
  : Field extends VariantSchema.Field<infer S> ? VariantSchema.Field<
      {
        readonly [K in keyof S]: S[K] extends Schema.Schema.Any
          ? K extends VariantsDatabase ? Schema.OptionFromNullOr<S[K]> :
          Schema.optionalWith<S[K], { as: "Option"; nullable: true }>
          : never
      }
    > :
  never = fieldEvolve({
    select: Schema.OptionFromNullOr,
    insert: Schema.OptionFromNullOr,
    update: Schema.OptionFromNullOr,
    json: Schema.optionalWith({ as: "Option" }),
    jsonCreate: Schema.optionalWith({ as: "Option", nullable: true }),
    jsonUpdate: Schema.optionalWith({ as: "Option", nullable: true })
  }) as any

/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeFromDate extends
  Schema.transform<
    typeof Schema.ValidDateFromSelf,
    typeof Schema.DateTimeUtcFromSelf
  >
{}

/**
 * @since 1.0.0
 * @category date & time
 */
export const DateTimeFromDate: DateTimeFromDate = Schema.transform(
  Schema.ValidDateFromSelf,
  Schema.DateTimeUtcFromSelf,
  {
    decode: DateTime.unsafeFromDate,
    encode: DateTime.toDateUtc
  }
)

/**
 * @since 1.0.0
 * @category date & time
 */
export interface Date extends Schema.transformOrFail<typeof Schema.String, typeof Schema.DateTimeUtcFromSelf> {}

/**
 * A schema for a `DateTime.Utc` that is serialized as a date string in the
 * format `YYYY-MM-DD`.
 *
 * @since 1.0.0
 * @category date & time
 */
export const Date: Date = Schema.transformOrFail(
  Schema.String,
  Schema.DateTimeUtcFromSelf,
  {
    decode: (s, _, ast) =>
      DateTime.make(s).pipe(
        Option.map(DateTime.removeTime),
        Option.match({
          onNone: () => ParseResult.fail(new ParseResult.Type(ast, s)),
          onSome: (dt) => ParseResult.succeed(dt)
        })
      ),
    encode: (dt) => ParseResult.succeed(DateTime.formatIsoDate(dt))
  }
)

/**
 * @since 1.0.0
 * @category date & time
 */
export const DateWithNow = VariantSchema.Overrideable(Date, Schema.DateTimeUtcFromSelf, {
  generate: Option.match({
    onNone: () => Effect.map(DateTime.now, DateTime.removeTime),
    onSome: (dt) => Effect.succeed(DateTime.removeTime(dt))
  })
})

/**
 * @since 1.0.0
 * @category date & time
 */
export const DateTimeWithNow = VariantSchema.Overrideable(Schema.String, Schema.DateTimeUtcFromSelf, {
  generate: Option.match({
    onNone: () => Effect.map(DateTime.now, DateTime.formatIso),
    onSome: (dt) => Effect.succeed(DateTime.formatIso(dt))
  })
})

/**
 * @since 1.0.0
 * @category date & time
 */
export const DateTimeFromDateWithNow = VariantSchema.Overrideable(Schema.DateFromSelf, Schema.DateTimeUtcFromSelf, {
  generate: Option.match({
    onNone: () => Effect.map(DateTime.now, DateTime.toDateUtc),
    onSome: (dt) => Effect.succeed(DateTime.toDateUtc(dt))
  })
})

/**
 * @since 1.0.0
 * @category date & time
 */
export const DateTimeFromNumberWithNow = VariantSchema.Overrideable(Schema.Number, Schema.DateTimeUtcFromSelf, {
  generate: Option.match({
    onNone: () => Effect.map(DateTime.now, DateTime.toEpochMillis),
    onSome: (dt) => Effect.succeed(DateTime.toEpochMillis(dt))
  })
})

/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeInsert extends
  VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtc
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, string>
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * A field that represents a date-time value that is inserted as the current
 * `DateTime.Utc`. It is serialized as a string for the database.
 *
 * It is omitted from updates and is available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export const DateTimeInsert: DateTimeInsert = Field({
  select: Schema.DateTimeUtc,
  insert: DateTimeWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeInsertFromDate extends
  VariantSchema.Field<{
    readonly select: DateTimeFromDate
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * A field that represents a date-time value that is inserted as the current
 * `DateTime.Utc`. It is serialized as a `Date` for the database.
 *
 * It is omitted from updates and is available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export const DateTimeInsertFromDate: DateTimeInsertFromDate = Field({
  select: DateTimeFromDate,
  insert: DateTimeFromDateWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeInsertFromNumber extends
  VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtcFromNumber
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, number>
    readonly json: typeof Schema.DateTimeUtcFromNumber
  }>
{}

/**
 * A field that represents a date-time value that is inserted as the current
 * `DateTime.Utc`. It is serialized as a `number`.
 *
 * It is omitted from updates and is available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export const DateTimeInsertFromNumber: DateTimeInsertFromNumber = Field({
  select: Schema.DateTimeUtcFromNumber,
  insert: DateTimeFromNumberWithNow,
  json: Schema.DateTimeUtcFromNumber
})

/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeUpdate extends
  VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtc
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, string>
    readonly update: VariantSchema.Overrideable<DateTime.Utc, string>
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * A field that represents a date-time value that is updated as the current
 * `DateTime.Utc`. It is serialized as a string for the database.
 *
 * It is set to the current `DateTime.Utc` on updates and inserts and is
 * available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export const DateTimeUpdate: DateTimeUpdate = Field({
  select: Schema.DateTimeUtc,
  insert: DateTimeWithNow,
  update: DateTimeWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeUpdateFromDate extends
  VariantSchema.Field<{
    readonly select: DateTimeFromDate
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>
    readonly update: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * A field that represents a date-time value that is updated as the current
 * `DateTime.Utc`. It is serialized as a `Date` for the database.
 *
 * It is set to the current `DateTime.Utc` on updates and inserts and is
 * available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export const DateTimeUpdateFromDate: DateTimeUpdateFromDate = Field({
  select: DateTimeFromDate,
  insert: DateTimeFromDateWithNow,
  update: DateTimeFromDateWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeUpdateFromNumber extends
  VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtcFromNumber
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, number>
    readonly update: VariantSchema.Overrideable<DateTime.Utc, number>
    readonly json: typeof Schema.DateTimeUtcFromNumber
  }>
{}

/**
 * A field that represents a date-time value that is updated as the current
 * `DateTime.Utc`. It is serialized as a `number`.
 *
 * It is set to the current `DateTime.Utc` on updates and inserts and is
 * available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export const DateTimeUpdateFromNumber: DateTimeUpdateFromNumber = Field({
  select: Schema.DateTimeUtcFromNumber,
  insert: DateTimeFromNumberWithNow,
  update: DateTimeFromNumberWithNow,
  json: Schema.DateTimeUtcFromNumber
})

/**
 * @since 1.0.0
 * @category json
 */
export interface JsonFromString<S extends Schema.Schema.All | Schema.PropertySignature.All>
  extends
    VariantSchema.Field<{
      readonly select: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>
      readonly insert: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>
      readonly update: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>
      readonly json: S
      readonly jsonCreate: S
      readonly jsonUpdate: S
    }>
{}

/**
 * A field that represents a JSON value stored as text in the database.
 *
 * The "json" variants will use the object schema directly.
 *
 * @since 1.0.0
 * @category json
 */
export const JsonFromString = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
  schema: S
): JsonFromString<S> => {
  const parsed = Schema.parseJson(schema as any)
  return Field({
    select: parsed,
    insert: parsed,
    update: parsed,
    json: schema,
    jsonCreate: schema,
    jsonUpdate: schema
  }) as any
}

/**
 * @since 1.0.0
 * @category uuid
 */
export interface UuidV4Insert<B extends string | symbol> extends
  VariantSchema.Field<{
    readonly select: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>
    readonly insert: VariantSchema.Overrideable<Uint8Array & Brand<B>, Uint8Array>
    readonly update: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>
    readonly json: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>
  }>
{}

/**
 * @since 1.0.0
 * @category uuid
 */
export const UuidV4WithGenerate = <B extends string | symbol>(
  schema: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>
): VariantSchema.Overrideable<Uint8Array & Brand<B>, Uint8Array> =>
  VariantSchema.Overrideable(Schema.Uint8ArrayFromSelf, schema, {
    generate: Option.match({
      onNone: () => Effect.sync(() => Uuid.v4({}, new Uint8Array(16))),
      onSome: (id) => Effect.succeed(id as any)
    }),
    constructorDefault: () => Uuid.v4({}, new Uint8Array(16)) as any
  })

/**
 * A field that represents a binary UUID v4 that is generated on inserts.
 *
 * @since 1.0.0
 * @category uuid
 */
export const UuidV4Insert = <const B extends string | symbol>(
  schema: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>
): UuidV4Insert<B> =>
  Field({
    select: schema,
    insert: UuidV4WithGenerate(schema),
    update: schema,
    json: schema
  })

/**
 * Create a simple CRUD repository from a model.
 *
 * @since 1.0.0
 * @category repository
 */
export const makeRepository = <
  S extends Any,
  Id extends (keyof S["Type"]) & (keyof S["update"]["Type"]) & (keyof S["fields"])
>(Model: S, options: {
  readonly tableName: string
  readonly spanPrefix: string
  readonly idColumn: Id
}): Effect.Effect<
  {
    readonly insert: (
      insert: S["insert"]["Type"]
    ) => Effect.Effect<S["Type"], never, S["Context"] | S["insert"]["Context"]>
    readonly insertVoid: (
      insert: S["insert"]["Type"]
    ) => Effect.Effect<void, never, S["Context"] | S["insert"]["Context"]>
    readonly update: (
      update: S["update"]["Type"]
    ) => Effect.Effect<S["Type"], never, S["Context"] | S["update"]["Context"]>
    readonly updateVoid: (
      update: S["update"]["Type"]
    ) => Effect.Effect<void, never, S["Context"] | S["update"]["Context"]>
    readonly findById: (
      id: Schema.Schema.Type<S["fields"][Id]>
    ) => Effect.Effect<Option.Option<S["Type"]>, never, S["Context"] | Schema.Schema.Context<S["fields"][Id]>>
    readonly delete: (
      id: Schema.Schema.Type<S["fields"][Id]>
    ) => Effect.Effect<void, never, Schema.Schema.Context<S["fields"][Id]>>
  },
  never,
  SqlClient
> =>
  Effect.gen(function*() {
    const sql = yield* SqlClient
    const idSchema = Model.fields[options.idColumn] as Schema.Schema.Any
    const idColumn = options.idColumn as string

    const insertSchema = SqlSchema.single({
      Request: Model.insert,
      Result: Model,
      execute: (request) =>
        sql.onDialectOrElse({
          mysql: () =>
            sql`insert into ${sql(options.tableName)} ${sql.insert(request)};
select * from ${sql(options.tableName)} where ${sql(idColumn)} = LAST_INSERT_ID();`.unprepared.pipe(
              Effect.map(([, results]) => results as any)
            ),
          orElse: () => sql`insert into ${sql(options.tableName)} ${sql.insert(request).returning("*")}`
        })
    })
    const insert = (
      insert: S["insert"]["Type"]
    ): Effect.Effect<S["Type"], never, S["Context"] | S["insert"]["Context"]> =>
      insertSchema(insert).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.insert`, {
          captureStackTrace: false,
          attributes: { insert }
        })
      ) as any

    const insertVoidSchema = SqlSchema.void({
      Request: Model.insert,
      execute: (request) => sql`insert into ${sql(options.tableName)} ${sql.insert(request)}`
    })
    const insertVoid = (
      insert: S["insert"]["Type"]
    ): Effect.Effect<void, never, S["Context"] | S["insert"]["Context"]> =>
      insertVoidSchema(insert).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.insertVoid`, {
          captureStackTrace: false,
          attributes: { insert }
        })
      ) as any

    const updateSchema = SqlSchema.single({
      Request: Model.update,
      Result: Model,
      execute: (request) =>
        sql.onDialectOrElse({
          mysql: () =>
            sql`update ${sql(options.tableName)} set ${sql.update(request, [idColumn])} where ${sql(idColumn)} = ${
              request[idColumn]
            };
select * from ${sql(options.tableName)} where ${sql(idColumn)} = ${request[idColumn]};`.unprepared.pipe(
              Effect.map(([, results]) => results as any)
            ),
          orElse: () =>
            sql`update ${sql(options.tableName)} set ${sql.update(request, [idColumn])} where ${sql(idColumn)} = ${
              request[idColumn]
            } returning *`
        })
    })
    const update = (
      update: S["update"]["Type"]
    ): Effect.Effect<S["Type"], never, S["Context"] | S["update"]["Context"]> =>
      updateSchema(update).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.update`, {
          captureStackTrace: false,
          attributes: { update }
        })
      ) as any

    const updateVoidSchema = SqlSchema.void({
      Request: Model.update,
      execute: (request) =>
        sql`update ${sql(options.tableName)} set ${sql.update(request, [idColumn])} where ${sql(idColumn)} = ${
          request[idColumn]
        }`
    })
    const updateVoid = (
      update: S["update"]["Type"]
    ): Effect.Effect<void, never, S["Context"] | S["update"]["Context"]> =>
      updateVoidSchema(update).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.updateVoid`, {
          captureStackTrace: false,
          attributes: { update }
        })
      ) as any

    const findByIdSchema = SqlSchema.findOne({
      Request: idSchema,
      Result: Model,
      execute: (id) => sql`select * from ${sql(options.tableName)} where ${sql(idColumn)} = ${id}`
    })
    const findById = (
      id: Schema.Schema.Type<S["fields"][Id]>
    ): Effect.Effect<Option.Option<S["Type"]>, never, S["Context"] | Schema.Schema.Context<S["fields"][Id]>> =>
      findByIdSchema(id).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.findById`, {
          captureStackTrace: false,
          attributes: { id }
        })
      ) as any

    const deleteSchema = SqlSchema.void({
      Request: idSchema,
      execute: (id) => sql`delete from ${sql(options.tableName)} where ${sql(idColumn)} = ${id}`
    })
    const delete_ = (
      id: Schema.Schema.Type<S["fields"][Id]>
    ): Effect.Effect<void, never, Schema.Schema.Context<S["fields"][Id]>> =>
      deleteSchema(id).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.delete`, {
          captureStackTrace: false,
          attributes: { id }
        })
      ) as any

    return { insert, insertVoid, update, updateVoid, findById, delete: delete_ } as const
  })

/**
 * Create some simple data loaders from a model.
 *
 * @since 1.0.0
 * @category repository
 */
export const makeDataLoaders = <
  S extends AnyNoContext,
  Id extends (keyof S["Type"]) & (keyof S["update"]["Type"]) & (keyof S["fields"])
>(
  Model: S,
  options: {
    readonly tableName: string
    readonly spanPrefix: string
    readonly idColumn: Id
    readonly window: DurationInput
    readonly maxBatchSize?: number | undefined
  }
): Effect.Effect<
  {
    readonly insert: (insert: S["insert"]["Type"]) => Effect.Effect<S["Type"]>
    readonly insertVoid: (insert: S["insert"]["Type"]) => Effect.Effect<void>
    readonly findById: (id: Schema.Schema.Type<S["fields"][Id]>) => Effect.Effect<Option.Option<S["Type"]>>
    readonly delete: (id: Schema.Schema.Type<S["fields"][Id]>) => Effect.Effect<void>
  },
  never,
  SqlClient | Scope
> =>
  Effect.gen(function*() {
    const sql = yield* SqlClient
    const idSchema = Model.fields[options.idColumn] as Schema.Schema.Any
    const idColumn = options.idColumn as string

    const insertResolver = yield* SqlResolver.ordered(`${options.spanPrefix}/insert`, {
      Request: Model.insert,
      Result: Model,
      execute: (request) =>
        sql.onDialectOrElse({
          mysql: () =>
            Effect.forEach(request, (request) =>
              sql`insert into ${sql(options.tableName)} ${sql.insert(request)};
select * from ${sql(options.tableName)} where ${sql(idColumn)} = LAST_INSERT_ID();`.unprepared.pipe(
                Effect.map(([, results]) => results[0] as any)
              ), { concurrency: 10 }),
          orElse: () => sql`insert into ${sql(options.tableName)} ${sql.insert(request).returning("*")}`
        })
    })
    const insertLoader = yield* RRX.dataLoader(insertResolver, {
      window: options.window,
      maxBatchSize: options.maxBatchSize!
    })
    const insertExecute = insertResolver.makeExecute(insertLoader)
    const insert = (
      insert: S["insert"]["Type"]
    ): Effect.Effect<S["Type"], never, S["Context"] | S["insert"]["Context"]> =>
      insertExecute(insert).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.insert`, {
          captureStackTrace: false,
          attributes: { insert }
        })
      ) as any

    const insertVoidResolver = yield* SqlResolver.void(`${options.spanPrefix}/insertVoid`, {
      Request: Model.insert,
      execute: (request) => sql`insert into ${sql(options.tableName)} ${sql.insert(request)}`
    })
    const insertVoidLoader = yield* RRX.dataLoader(insertVoidResolver, {
      window: options.window,
      maxBatchSize: options.maxBatchSize!
    })
    const insertVoidExecute = insertVoidResolver.makeExecute(insertVoidLoader)
    const insertVoid = (
      insert: S["insert"]["Type"]
    ): Effect.Effect<void, never, S["Context"] | S["insert"]["Context"]> =>
      insertVoidExecute(insert).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.insertVoid`, {
          captureStackTrace: false,
          attributes: { insert }
        })
      ) as any

    const findByIdResolver = yield* SqlResolver.findById(`${options.spanPrefix}/findById`, {
      Id: idSchema,
      Result: Model,
      ResultId(request) {
        return request[idColumn]
      },
      execute: (ids) => sql`select * from ${sql(options.tableName)} where ${sql.in(idColumn, ids)}`
    })
    const findByIdLoader = yield* RRX.dataLoader(findByIdResolver, {
      window: options.window,
      maxBatchSize: options.maxBatchSize!
    })
    const findByIdExecute = findByIdResolver.makeExecute(findByIdLoader)
    const findById = (id: Schema.Schema.Type<S["fields"][Id]>): Effect.Effect<Option.Option<S["Type"]>> =>
      findByIdExecute(id).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.findById`, {
          captureStackTrace: false,
          attributes: { id }
        })
      ) as any

    const deleteResolver = yield* SqlResolver.void(`${options.spanPrefix}/delete`, {
      Request: idSchema,
      execute: (ids) => sql`delete from ${sql(options.tableName)} where ${sql.in(idColumn, ids)}`
    })
    const deleteLoader = yield* RRX.dataLoader(deleteResolver, {
      window: options.window,
      maxBatchSize: options.maxBatchSize!
    })
    const deleteExecute = deleteResolver.makeExecute(deleteLoader)
    const delete_ = (id: Schema.Schema.Type<S["fields"][Id]>): Effect.Effect<void> =>
      deleteExecute(id).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.delete`, {
          captureStackTrace: false,
          attributes: { id }
        })
      ) as any

    return { insert, insertVoid, findById, delete: delete_ } as const
  })
