import { DateTime } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("DateTimeZoned", () => {
  const schema = S.DateTimeZoned
  const dt = DateTime.unsafeMakeZoned(0, { timeZone: "Europe/London" })

  it.only("property tests", () => {
    // Util.roundtrip(schema)

    // Failing seed, producing DateTime.Zoned(0001-12-31T23:59:59.999+8751:20[Pacific/Pitcairn])
    Util.roundtrip(schema, {
      seed: -1896245275,
      path: "2:1:0:0:0:0:0:0:3:1:3:1:0:4:1:0:2:1:1:1:3:0:0:1:1:0:0:0:0:1",
      verbose: true
    })
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "1970-01-01T01:00:00.000+01:00[Europe/London]", dt)
    await Util.expectDecodeUnknownFailure(
      schema,
      "1970-01-01T00:00:00.000Z",
      `DateTimeZoned
└─ Transformation process failure
   └─ Unable to decode "1970-01-01T00:00:00.000Z" into a DateTime.Zoned`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `DateTimeZoned
└─ Transformation process failure
   └─ Unable to decode "a" into a DateTime.Zoned`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, dt, "1970-01-01T01:00:00.000+01:00[Europe/London]")
  })
})
