import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("optional", () => {
  it("should expose a from property", () => {
    const schema = S.optional(S.String)
    expect(schema.from).toStrictEqual(S.String)
  })

  it("if the input is Schema.Undefined should not duplicate the schema", () => {
    const schema = S.optional(S.Undefined)
    expect((schema.ast as any as S.PropertySignatureDeclaration).type).toStrictEqual(S.Undefined.ast)
  })

  it("if the input is Schema.Never should include the input in the schema", () => {
    const schema = S.optional(S.Never)
    expect((schema.ast as any as S.PropertySignatureDeclaration).type).toStrictEqual(S.Undefined.ast)
  })

  it("should expose a from property after an annotations call", () => {
    const schema = S.optional(S.String).annotations({})
    expect(schema.from).toStrictEqual(S.String)
  })

  it("decoding / encoding", async () => {
    const schema = S.Struct({
      a: S.optional(S.NumberFromString)
    })
    await Util.assertions.decoding.succeed(schema, {}, {})
    await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: undefined })
    await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
    await Util.assertions.decoding.fail(
      schema,
      { a: "a" },
      `{ readonly a?: NumberFromString | undefined }
└─ ["a"]
   └─ NumberFromString | undefined
      ├─ NumberFromString
      │  └─ Transformation process failure
      │     └─ Unable to decode "a" into a number
      └─ Expected undefined, actual "a"`
    )

    await Util.assertions.encoding.succeed(schema, {}, {})
    await Util.assertions.encoding.succeed(schema, { a: undefined }, { a: undefined })
    await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
  })

  it("Schema.Never as input", async () => {
    const schema = S.Struct({
      a: S.optional(S.Never)
    })
    await Util.assertions.decoding.succeed(schema, {}, {})
    await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: undefined })
    await Util.assertions.decoding.fail(
      schema,
      { a: "a" },
      `{ readonly a?: undefined }
└─ ["a"]
   └─ Expected undefined, actual "a"`
    )

    await Util.assertions.encoding.succeed(schema, {}, {})
    await Util.assertions.encoding.succeed(schema, { a: undefined }, { a: undefined })
  })
})
