import { isNumber } from '../utils/is'
import { Token } from '../token'
import { parseKey, MemberDef } from './base'
import { INVALID_TYPE } from '../errors'
import TypeDefinition from './schema-type-definition'
import ParserError from '../errors/parser-error';

// age?: { number, true, 10, min:10, max:20}

/**
 * Represents the InternetObjectNumber, performs following validations.
 * - Value is number
 * - Value is optional
 * - Value is nullable
 * - Value >= schema.min
 * - Value <= schema.max
 * - Value is in choices
 */
class NumberDef implements TypeDefinition {

  getType = () => {
    return "number"
  }

  validate = (key: string, token: Token, memberDef: MemberDef): number => {

    // Optional check
    if (memberDef.optional && token.value === undefined) {
      return memberDef.default
    }

    // Nullability check
    if (token.value === null && !memberDef.null) {
      throw new ParserError("null-not-allowed", token)
    }

    // choices check
    if (memberDef.choices !== undefined && token.value in memberDef.choices === false) {
      throw new ParserError("value-not-in-choices", token)
    }

    // Typeof check
    if (token.type !== "number") {
      throw Error(INVALID_TYPE)
    }

    if (isNumber(memberDef.min)) {
      const min = memberDef.min
      if (token.value < min) {
        throw new ParserError(
          `The "${ key }" must be greater than or equal to ${memberDef.min}, Currently it is "${token.value}".`, token
        )
      }
    }

    if (isNumber(memberDef.max) && token.value > memberDef.max) {
      throw new ParserError('invalid-value', token)
    }

    return token.value
  }

  get type() {
    return 'number'
  }
}


export default NumberDef
