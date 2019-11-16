import {
  DATASEP,
  HYPHEN,
  NEW_LINE,
  SEPARATORS,
  SPACE,
  STRING_ENCLOSER,
  TILDE,
  BACKSLASH,
  HASH,
  AT,
  TRUE,
  TRUE_F,
  FALSE,
  FALSE_F,
  NULL,
  NULL_F
} from './constants'
import { Token } from '.'
import ErrorCodes from '../errors/io-error-codes'
import { InternetObjectSyntaxError } from '../errors/io-error'
import { copySync } from 'fs-extra'
import { stringify } from 'querystring'

type NullableToken = Token | null

const escapeCharMap: any = {
  '\\': '\\',
  '/': '/',
  '"': '"',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t'
}

export default class Tokenizer {
  private _text: string
  private _tokens: Token[] = []

  // Last token specific props
  private _value = ''
  private _lastToken: NullableToken = null
  private _index: number = -1
  private _row: number = 1
  private _col: number = 0
  private _start: number = -1
  private _end: number = -1
  private _isBlank = true
  private _tokenLength = 0
  private _isQuoatedString: boolean = false
  private _isRawString: boolean = false
  private _isEscaping = false
  private _isCommenting = false
  private _done: boolean = false

  public constructor(text: string) {
    this._text = text
  }

  public read = (): NullableToken => {
    const text = this._text
    this._lastToken = {} as Token
    this._value = ''
    this._start = -1
    this._end = -1
    this._tokenLength = 0
    this._isQuoatedString = false

    return this._next()
  }

  public readAll = () => {
    // let token = this.read()
    while (!this._done) {
      this.read()
    }
    return this
  }

  public get done(): boolean {
    return this._done
  }

  public get length(): number {
    return this._tokens.length
  }

  public push = (...items: Token[]): Tokenizer => {
    this._tokens.push(...items)
    return this
  }

  public get tokens() {
    return this._tokens
  }

  public get(index: number): Token {
    return this._tokens[index]
  }

  private _returnToken = (): NullableToken => {
    const token = this._lastToken
    if (token === null) return null

    // if (this._start === -1 || this._end === -1) return null

    let value: any = this._value
    token.token = this._text.substring(this._start, this._end + (this._isQuoatedString ? 1 : 1))
    // console.warn(">>>", this._text, JSON.stringify(this._value), this._index, this._start, this._end, this._value, token.token)

    const confirmedString = token.token.endsWith(STRING_ENCLOSER)

    // Trim the white spaces only when the strings does not ends with
    // the string encloser.
    if (!confirmedString) {
      value = this._value.trim()
      // .replace(/^[\s\uFEFF\xA0]+/g, "") // Trim starting spaces
      // .replace(/[\s\uFEFF\xA0]+$/g, "") // Trim trailing spaces
    }

    // .replace(/^"+|(\\?")$/g, (g1) => { // Trim end quotes
    //   return g1 === "\\\"" ? g1 : ""
    // })
    let numVal = Number(value)
    let type = 'string'

    if (SEPARATORS.indexOf(value) >= 0 || value === TILDE) {
      type = 'sep'
    } else if (value === DATASEP) {
      type = 'datasep'
    }
    // When validating isNaN, check value is not a blank ''.
    // When the value is blank, Number(value) will set the numVal to 0
    else if (!isNaN(numVal) && value.trim() !== '') {
      value = numVal
      type = 'number'
    } else if (confirmedString === false && (value === TRUE || value === TRUE_F)) {
      value = true
      type = 'boolean'
    } else if (confirmedString === false && (value === FALSE || value === FALSE_F)) {
      value = false
      type = 'boolean'
    } else if (confirmedString === false && (value === NULL || value === NULL_F)) {
      value = null
      type = 'null'
    }

    token.value = value
    token.type = type

    this._tokens.push(token)
    // console.log(">", this._index)
    this.skipNextWhiteSpaces()
    // console.log("<", this._index)
    return token
  }

  private _next = (): NullableToken => {
    // Advance the step
    this._col += 1
    const index = ++this._index

    // Return token when text ends
    let ch = this._text[index]
    if (ch === undefined) {
      // Throw and error when escaping is not closed on last char
      if (this._isEscaping) {
        throw new InternetObjectSyntaxError(
          ErrorCodes.incompleteEscapeSequence,
          'End of the text reached before finishing the escape sequence.'
        )
      }

      this._done = true
      return this._returnToken()
    }

    const token = this._lastToken
    let chCode = ch.charCodeAt(0)

    let prevCh = index > 0 ? this._text[index - 1] : ''
    if (!token) return null // Bypass TS check

    let nextCh = this._text[index + 1]
    let nextChCode = nextCh === undefined ? -1 : nextCh.charCodeAt(0)
    let isNextWS = nextCh <= SPACE

    // Identify char types
    let isWS = ch <= SPACE // Is white space or control char
    let isNewLine = ch === NEW_LINE // Is new line

    let isSep = SEPARATORS.indexOf(ch) >= 0 // Is separator
    let isNextSep = SEPARATORS.indexOf(nextCh) >= 0

    const isCollectionSep = ch === TILDE
    let isNextCollectionSep = nextCh === TILDE

    const isStarted = this._start !== -1

    const isDataSep = this._text.substr(index - 2, 3) === DATASEP
    let isNextDataSep = this._text.substr(index + 1, 3) === DATASEP

    // While the comment mode is active!
    if (this._isCommenting) {
      // Comment mode ends with new line, hence, turn it off when
      // a new line char is encountered.
      if (isNewLine) {
        this._isCommenting = false
      } else {
        // Skip and ignore chars during the comment mode!
        return this._next()
      }
    }

    // Handle white-spaces
    if (isWS) {
      // Normalize newline to \n char when other newline modes such as '\r\n' & '\r' found
      if (ch === '\r') {
        // Ignore current \r when a newline found in \r\n pair
        if (nextCh === '\n') {
          return this._next()
        }
        ch = '\n' // Else replace \r with \n
        isNewLine = true
      }

      if (this._tokenLength > 0) this._value += ch

      // Update values in case of new line
      if (isNewLine) {
        this._row += 1
        this._col = 0
        return this._next()
      }

      if ((isNextSep || isNextCollectionSep || isNextDataSep) && isStarted) {
        if (this._col === 0) this._col = 1
        return this._returnToken()
      }

      return this._next()
    }

    // // See if whitespace is escaped! Such as " \n  \t \n "
    // if (this._start === -1 && this._isRawString === false) {
    //   if(ch === BACKSLASH) {
    //   }

    // }

    // If not whitespace
    // =================

    this._end = index

    // Processing not started yet!
    if (this._start === -1) {
      this._start = index

      // Set the row and col if not set yet.
      if (!token.col) {
        token.index = this._start
        token.col = this._col
        token.row = this._row
      }
    }

    this._tokenLength += 1

    // Handle string escapes when not a raw string
    if (ch === BACKSLASH && this._isEscaping === false) {
      // Only allow escaping within quoted strings
      if (this._isQuoatedString) {
        this._isEscaping = true
        return this._next()
      } else if (!this._isRawString) {
        throw new InternetObjectSyntaxError(
          ErrorCodes.invalidChar,
          '\\ not allowed in open strings.',
          token
        )
      }
    }

    // Process the first char
    if (this._tokenLength === 1) {
      // Start raw string when @" is found
      if (ch === AT && nextCh === STRING_ENCLOSER) {
        this._isRawString = true
        return this._next()
      }
      // When the " is encountered at first char,
      // activate enclosed string mode
      else if (ch === STRING_ENCLOSER) {
        this._isQuoatedString = true
        return this._next()
      }
    }

    // When escaping, escape next char!
    if (this._isEscaping) {
      this._isEscaping = false

      // Escape " when rawstring mode is active!
      if (this._isRawString) {
        this._value += STRING_ENCLOSER // Quote is the only escape char during raw string
        return this._next()
      }

      this._value += ch in escapeCharMap ? escapeCharMap[ch] : ch
      return this._next()
    }

    // Process string encloser (")
    if (ch === STRING_ENCLOSER) {
      if (this._isQuoatedString) {
        this._isQuoatedString = false
        return this._returnToken()
      }

      // Handle raw string!
      if (this._isRawString) {
        // Open string!
        if (this._tokenLength === 2) {
          return this._next()
        }

        // Initiate the escape mode when the first of two " is found
        if (!this._isEscaping && nextCh === STRING_ENCLOSER) {
          this._isEscaping = true
          return this._next()
        }

        this._isRawString = false
        return this._returnToken()
      }

      // Do not allow unescaped quotation mark in the
      // string
      else {
        throw new InternetObjectSyntaxError(
          ErrorCodes.invalidChar,
          `Invalid character '${ch}' encountered`,
          this._node
        )
      }
    }

    // When the enclosed string is not active
    if (!(this._isQuoatedString || this._isRawString)) {
      // Initiate the commenting mode when
      if (ch === HASH) {
        this._isCommenting = true
        return this._next()
      }

      if (isSep || isNextSep || isCollectionSep || isNextCollectionSep) {
        this._value += ch
        return this._returnToken()
      }

      // Check for data separator
      else if (ch === HYPHEN) {
        // let value = this._text.substring(this._start, this._end + 1)
        if (isDataSep) {
          this._value = '---'
          return this._returnToken()
        }
      }
    }
    this._value += ch
    return this._next()
  }

  private skipNextWhiteSpaces() {
    const ch = this._text[this._index + 1]

    // console.log("wow", ch, this._text.length, this._index)

    // Return token when text ends
    if (ch === undefined) {
      this._done = true
      return
    }

    // If next ch is not ws, return
    if (ch > SPACE) return

    // Advance the step
    this._col += 1
    ++this._index

    if (this._tokenLength > 0) this._value += ch

    // Update values in case of new line
    if (ch === NEW_LINE) {
      this._row += 1
      this._col = 0
    }
    this.skipNextWhiteSpaces()
  }

  private get _node() {
    return {
      index: this._index,
      row: this._row,
      col: this._col
    }
  }
}
