
import DataParser from './data';
import Header from './header';
import Schema from './header/schema';
// import './constants'
import ASTParser from './parser/ast-parser';
import { print } from './utils';
import { isString, isArray } from './utils/is';
import { InternetObjectError } from './errors/io-error';
import ErrorCodes from './errors/io-error-codes';
import { SCHEMA } from './parser/constants';

/**
 * Represents the InternetObject. A class that is
 */
export class InternetObject<T = any> {

  constructor(o:any, schema?:string|Schema) {
    let header: Header
    let data: any

    if (isString(o)) {
      const parsed =_parse(o, schema)
      header = parsed.header
      data = parsed.data
    } else {
      const parsed = _parseObject(o, schema)
      data = parsed.data
      header = parsed.header
    }
    this._data = data
    this._header = header
  }

  private _header:Header
  public get header() : Header {
    return this._header
  }

  public get schema() {
    return this._header.schema
  }

  private _data:T
  public get data():T {
    return this._data
  }
}

function _getCompiledSchema(schema?: string|Schema) {
  if (!schema) return null

  if (schema instanceof Schema) {
    return schema
  }

  return Schema.compile(schema)
}

function _parseObject(o:any, schema?:string|Schema) {
  const compiledSchema = _getCompiledSchema(schema)

  if (compiledSchema === null) {
    return {
      data: o,
      header: new Header
    }
  }

  return {
    data: compiledSchema.apply(o),
    header: (new Header).set(SCHEMA, compiledSchema)
  }

}


// Parses the Internet Object string and returns the value
function _parse(text:string, schema?:string|Schema) {
  const parser = new ASTParser(text)

  let compiledSchema:Schema|null = null
  let compiledHeader:Header|null = null

  // Parse the text
  parser.parse()

  if (schema) {
    if(isString(schema)) {
      compiledSchema = Schema.compile(schema)
    }
    else if (schema instanceof Schema) {
      compiledSchema = schema
    }
    else {
      // TODO: Throw better error
      throw new InternetObjectError(ErrorCodes.invalidSchema)
    }
  }

  let header:Header
  if(parser.tree.header) {
    header = compiledSchema === null
      ? Header.compile(parser.tree.header)
      : Header.compile(parser.tree.header, compiledSchema)

    compiledSchema = header.schema ? header.schema : compiledSchema
  }
  else {
    header = compiledSchema === null
      ? new Header
      : (new Header).set(SCHEMA, compiledSchema)
  }

  const data = compiledSchema
          ? compiledSchema.apply(parser.tree.data)
          : DataParser.parse(parser.tree.data)

  return {header, data}



  // if (header) {

  // }
  // else if (schema) {
  //   // If schema is string compile it and apply
  //   if (isString(schema)) {
  //     const astSchmeaParser = new ASTParser(schema, true)
  //     astSchmeaParser.parse()
  //     const parser.header = astSchmeaParser.header
  //     if(parser.header) {
  //       const header = Header.compile(parser.header)
  //       compiledSchema = header.schema
  //     }
  //   }
  //   // If schema is already compiled, prioratize it over schema passed in text
  //   else if (schema instanceof  Schema) {
  //     compiledSchema = schema
  //   }
  //   else {
  //     // TODO: Throw better error
  //     throw new InternetObjectError(ErrorCodes.invalidSchema)
  //   }
  // }
  // // If object contains schema, parse and compile it
  // else if (!schema && parser.header) {
  //   const header = Header.compile(parser.header)
  //   print("---", header.length)
  //   compiledSchema = header.schema
  //   // compiledSchema = Schema.compile(parser.h)
  // }

  // const iObject = new InternetObject()
  // if (compiledSchema === null) {
  //   iObject._data = DataParser.parse(data)
  //   iObject._schema = null
  //   return iObject
  // }

  // // compiledSchema.apply(data)
  // iObject._schema = compiledSchema
  // iObject._data = compiledSchema.apply(data)
  // return iObject
}

function _compileSchema(text:string): Schema {
  const header = Header.compile(text)
  return header.schema
}


