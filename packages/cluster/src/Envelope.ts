/**
 * @since 1.0.0
 */
import type * as Message from "@effect/cluster/Message"
import { RecipientAddress } from "@effect/cluster/RecipientAddress"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Data from "effect/Data"
import type * as Equal from "effect/Equal"
import { dual } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as PrimaryKey from "effect/PrimaryKey"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/Envelope")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * An `Envelope` represents a serializable container for a request that will be
 * sent to an entity.
 *
 * The primary key of an `Envelope` provides the full address of the entity to
 * which the request should be sent, as well as the identifier of the request,
 * in the format: `<request-identifier>@<recipient-type>#<entity-identifier>`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Envelope<Req extends Message.Message.Any>
  extends
    Equal.Equal,
    PrimaryKey.PrimaryKey,
    Serializable.SerializableWithResult<
      Envelope<Req>,
      Envelope.Encoded<Serializable.Serializable.Encoded<Req>>,
      Serializable.Serializable.Context<Req>,
      Serializable.WithResult.Success<Req>,
      Serializable.WithResult.SuccessEncoded<Req>,
      Serializable.WithResult.Error<Req>,
      Serializable.WithResult.ErrorEncoded<Req>,
      Serializable.WithResult.Context<Req>
    >,
    Envelope.Proto<Req>
{}

/**
 * @since 1.0.0
 */
export declare namespace Envelope {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto<Req extends Message.Message.Any> {
    readonly [TypeId]: TypeId
    readonly address: RecipientAddress
    readonly message: Req
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded<IA> {
    readonly address: RecipientAddress.Encoded
    readonly message: IA
  }

  export type Fields$<A extends Schema.Schema.Any> = {
    address: typeof RecipientAddress
    message: A
  }

  export interface Envelope$<A extends Schema.Schema.Any> extends
    Schema.Class<
      Envelope$<A>,
      Fields$<A>,
      Schema.Struct.Encoded<Fields$<A>>,
      Schema.Struct.Context<Fields$<A>>,
      Schema.Struct.Constructor<Fields$<A>>,
      {},
      {}
    >
  {}
}

const EnvelopeProto = Data.unsafeStruct({
  address: undefined,
  message: undefined,
  [PrimaryKey.symbol](this: Envelope<any>) {
    return (
      PrimaryKey.value(this.message) +
      "@" +
      this.address.recipientType +
      "#" +
      this.address.entityId
    )
  },
  get [Serializable.symbol]() {
    return schema(Serializable.selfSchema((this as any).message))
  },
  get [Serializable.symbolResult]() {
    return {
      Failure: Serializable.failureSchema((this as any).message),
      Success: Serializable.successSchema((this as any).message)
    }
  }
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Req extends Message.Message.Any>(
  address: RecipientAddress,
  message: Req
): Envelope<Req> => {
  const envelope = Object.create(EnvelopeProto)
  envelope.address = address
  envelope.message = message
  return envelope
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEnvelope = (u: unknown): u is Envelope<
  Message.Message.Any
> => Predicate.isObject(u) && Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category mapping
 */
export const map = dual<
  <A extends Message.Message.Any, B extends Message.Message.Any>(
    f: (value: A) => B
  ) => (
    self: Envelope<A>
  ) => Envelope<B>,
  <A extends Message.Message.Any, B extends Message.Message.Any>(
    self: Envelope<A>,
    f: (value: A) => B
  ) => Envelope<B>
>(2, (self, f) => make(self.address, f(self.message)))

/**
 * @since 1.0.0
 * @category schemas
 */
export const schema = <A extends Schema.Schema.Any>(message: A): Envelope.Envelope$<A> =>
  class LocalEnvelope$ extends Schema.Class<LocalEnvelope$>("@effect/cluster/Envelope")({
    address: RecipientAddress,
    message: message as any
  }) {
    [PrimaryKey.symbol](this: Envelope<any>) {
      return (
        PrimaryKey.value(this.message) +
        "@" +
        this.address.recipientType +
        "#" +
        this.address.entityId
      )
    }
    get [Serializable.symbol]() {
      return this.constructor
    }
    get [Serializable.symbolResult]() {
      return (this as any).message[Serializable.symbolResult]()
    }
  } as any
