import InternetObjectError from '../errors/io-error';
import IOErrorCodes from '../errors/io-error-codes';
import { ParserTreeValue } from '../parser/index';
import { Token } from '../parser/token';
import { isParserTree, isKeyVal, isString } from '../utils/is';
import MemberDef from './memberdef';
import TypeDef from './typedef';
import TypedefRegistry from './typedef-registry';
import { doCommonTypeCheck } from './utils';
import { ASTParserTree } from '../../dist/types/parser/index';

// age?: { number, true, 10, min:10, max:20}

/**
 * Represents the InternetObjectNumber, performs following validations.
 * - Value is an array
 * - Value is optional
 * - Value is nullable
 * - array is <= schema.maxLength
 * - array is >= schema.minLength
 * - Value is in choices
 */
class ArrayDef implements TypeDef {

  private _keys:any = null

  public getType () {
    return "array"
  }

  public process = (key: string, data:ParserTreeValue, memberDef: MemberDef):any => {

    const validatedData = doCommonTypeCheck(data, memberDef)
    if (validatedData !== data) return validatedData

    if (!isParserTree(data)) throw new Error("invalid-value")

    const schema = memberDef.schema

    let typeDef:TypeDef

    if (schema.type) {
      typeDef = TypedefRegistry.get(schema.type)
    }
    else {
      console.assert(false, "Invalid Case: Array schema must have a type attribute!")
      throw new Error("Verify this case!")
    }

    const array:any = []

    data.values.forEach((item) => {
      const value = typeDef.process(key, item, schema)
      array.push(value)
    })

    return array
  }

}

function _invlalidChoice(key:string, token:Token, min:number) {
  return [
    IOErrorCodes.invalidMinValue,
    `The "${ key }" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMinLength(key:string, token:Token, min:number) {
  return [
    IOErrorCodes.invalidMinValue,
    `The "${ key }" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMaxLength(key:string, token:Token, max:number) {
  return [
    IOErrorCodes.invalidMaxValue,
    `The "${ key }" must be less than or equal to ${max}, Currently it is "${token.value}".`,
    token
  ]
}

export default ArrayDef