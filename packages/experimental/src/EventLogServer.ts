/**
 * @since 1.0.0
 */
import type * as HttpServerError from "@effect/platform/HttpServerError"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberMap from "effect/FiberMap"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as PubSub from "effect/PubSub"
import * as RcMap from "effect/RcMap"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import * as Uuid from "uuid"
import type { RemoteId } from "./EventJournal.js"
import { EntryId, makeRemoteId } from "./EventJournal.js"
import type { ProtocolResponse } from "./EventLogRemote.js"
import { Ack, Changes, decodeRequest, encodeResponse, EncryptedRemoteEntry, Hello, Pong } from "./EventLogRemote.js"
import * as MsgPack from "./MsgPack.js"

/**
 * @since 1.0.0
 * @category websockets
 */
export const makeHttpHandler: Effect.Effect<
  Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    HttpServerError.RequestError,
    HttpServerRequest.HttpServerRequest | Scope
  >,
  never,
  Storage
> = Effect.gen(function*() {
  const storage = yield* Storage
  const remoteId = yield* storage.getId

  return Effect.gen(function*() {
    const request = yield* HttpServerRequest.HttpServerRequest
    const socket = yield* request.upgrade
    const writeRaw = yield* socket.writer
    const write = (response: typeof ProtocolResponse.Type) => Effect.suspend(() => writeRaw(encodeResponse(response)))
    const subscriptions = yield* FiberMap.make<number>()

    yield* write(new Hello({ remoteId }))

    yield* socket.run((data) => {
      const request = decodeRequest(data)
      switch (request._tag) {
        case "Ping": {
          return write(new Pong({ id: request.id }))
        }
        case "WriteEntries": {
          return Effect.gen(function*() {
            const entries = request.encryptedEntries.map(({ encryptedEntry, entryId }) =>
              new PersistedEntry({
                entryId,
                iv: request.iv,
                encryptedEntry
              })
            )
            yield* storage.write(request.publicKey, entries)
            return yield* write(new Ack({ id: request.id }))
          })
        }
        case "RequestChanges": {
          return Effect.gen(function*() {
            const mailbox = yield* storage.changes(request.publicKey, request.startSequence)
            yield* mailbox.takeAll.pipe(
              Effect.tap(([entries]) =>
                write(
                  new Changes({
                    subscriptionId: request.subscriptionId,
                    encryptedRemoteEntries: Chunk.toReadonlyArray(entries)
                  })
                )
              ),
              Effect.forever,
              FiberMap.run(subscriptions, request.subscriptionId)
            )
          })
        }
        case "StopChanges": {
          return FiberMap.remove(subscriptions, request.subscriptionId)
        }
      }
    }).pipe(Effect.orDie)

    return HttpServerResponse.empty()
  })
})

/**
 * @since 1.0.0
 * @category storage
 */
export class PersistedEntry extends Schema.Class<PersistedEntry>("@effect/experimental/EventLogServer/PersistedEntry")({
  entryId: EntryId,
  iv: Schema.Uint8ArrayFromSelf,
  encryptedEntry: Schema.Uint8ArrayFromSelf
}) {
  /**
   * @since 1.0.0
   */
  static fromMsgPack = MsgPack.schema(PersistedEntry)

  /**
   * @since 1.0.0
   */
  static encode = Schema.encodeSync(this.fromMsgPack)

  /**
   * @since 1.0.0
   */
  get entryIdString(): string {
    return Uuid.stringify(this.entryId)
  }
}

/**
 * @since 1.0.0
 * @category storage
 */
export class Storage extends Context.Tag("@effect/experimental/EventLogServer/Storage")<
  Storage,
  {
    readonly getId: Effect.Effect<RemoteId>
    readonly write: (publicKey: string, entries: ReadonlyArray<PersistedEntry>) => Effect.Effect<void>
    readonly changes: (
      publicKey: string,
      startSequence: number
    ) => Effect.Effect<Mailbox.ReadonlyMailbox<EncryptedRemoteEntry>, never, Scope>
  }
>() {}

/**
 * @since 1.0.0
 * @category storage
 */
export const makeStorageMemory: Effect.Effect<typeof Storage.Service, never, Scope> = Effect.gen(function*() {
  const knownIds = new Set<string>()
  const journals = new Map<string, Array<EncryptedRemoteEntry>>()
  const remoteId = makeRemoteId()
  const ensureJournal = (publicKey: string) => {
    let journal = journals.get(publicKey)
    if (journal) return journal
    journal = []
    journals.set(publicKey, journal)
    return journal
  }
  const pubsubs = yield* RcMap.make({
    lookup: (_publicKey: string) =>
      Effect.acquireRelease(
        PubSub.unbounded<EncryptedRemoteEntry>(),
        PubSub.shutdown
      ),
    idleTimeToLive: 60000
  })

  return Storage.of({
    getId: Effect.succeed(remoteId),
    write: (publicKey, entries) =>
      Effect.gen(function*() {
        const pubsub = yield* RcMap.get(pubsubs, publicKey)
        const journal = ensureJournal(publicKey)
        for (const entry of entries) {
          const idString = entry.entryIdString
          if (knownIds.has(idString)) continue
          knownIds.add(idString)
          const encrypted = EncryptedRemoteEntry.make({
            sequence: journal.length,
            entryId: entry.entryId,
            iv: entry.iv,
            encryptedEntry: entry.encryptedEntry
          })
          journal.push(encrypted)
          pubsub.unsafeOffer(encrypted)
        }
      }).pipe(Effect.scoped),
    changes: (publicKey, startSequence) =>
      Effect.gen(function*() {
        const mailbox = yield* Mailbox.make<EncryptedRemoteEntry>()
        const pubsub = yield* RcMap.get(pubsubs, publicKey)
        const queue = yield* pubsub.subscribe
        yield* mailbox.offerAll(ensureJournal(publicKey).slice(startSequence))
        yield* queue.takeBetween(1, Number.MAX_SAFE_INTEGER).pipe(
          Effect.tap((chunk) => mailbox.offerAll(chunk)),
          Effect.forever,
          Effect.forkScoped,
          Effect.interruptible
        )
        return mailbox as Mailbox.ReadonlyMailbox<EncryptedRemoteEntry>
      })
  })
})

/**
 * @since 1.0.0
 * @category storage
 */
export const layerStorageMemory: Layer.Layer<Storage> = Layer.scoped(Storage, makeStorageMemory)
