import 'jest'

import { isDateTime, isDate, isTime } from '../../src/utils/is'
import { parseDateTime, parseDate, parseTime } from '../../src/utils/datetime'

// Test anything here, just don't push changes to the server!
const dt1 = '2020-04-12T08:43:46.619Z'
const dt2 = '20200412T084346.619Z'

const date1 = '2020-12-20'
const date2 = '2020-12'
const date3 = '2020'

const date21 = '20201220'
const date22 = '202012'
const date23 = '2020'

const time1 = '18:20:30.999'
const time2 = '18:20:30'
const time3 = '18:20'
const time4 = '18'

const time21 = '182030.999'
const time22 = '182030'
const time23 = '1820'
const time24 = '18'

const invalidDate = 'not-a-date'

const testDateTime = (
  dt: any,
  year: any,
  month: any,
  date: any,
  hour: any = 0,
  minute: any = 0,
  seconds: any = 0,
  ms: any = 0
) => {
  // console.log(year)

  expect(dt).toBeInstanceOf(Date)
  expect(dt.getYear()).toBe(year - 1900)
  expect(dt.getMonth()).toBe(month - 1)
  expect(dt.getDate()).toBe(date)
}

describe('Datetime Tests', () => {
  it('tests the datatime validity', () => {
    expect(isDateTime(dt1)).toBeTruthy()
    expect(isDateTime(dt2)).toBeTruthy()

    expect(isDateTime(date1)).toBeFalsy()
    expect(isDateTime(time1)).toBeFalsy()
    expect(isDateTime(invalidDate)).toBeFalsy()
  })

  it('tests the datetime extration', () => {
    testDateTime(parseDateTime(dt1), 2020, 4, 12, 8, 43, 46, 619)
    testDateTime(parseDateTime(dt2), 2020, 4, 12, 8, 43, 46, 619)
  })
})

describe('Date Tests', () => {
  it('validates dates', () => {
    expect(isDate(date1)).toBeTruthy()
    expect(isDate(date2)).toBeTruthy()

    expect(isDate(dt1)).toBeFalsy()
    expect(isDate(time1)).toBeFalsy()
    expect(isDate(invalidDate)).toBeFalsy()
  })

  it('parses date', () => {
    testDateTime(parseDate(date1), 2020, 12, 20)
    testDateTime(parseDate(date2), 2020, 12, 1)
    testDateTime(parseDate(date3), 2020, 1, 1)

    testDateTime(parseDate(date21), 2020, 12, 20)
    testDateTime(parseDate(date22), 2020, 12, 1)
    testDateTime(parseDate(date23), 2020, 1, 1)
  })
})

describe('Time Tests', () => {
  it('validates times', () => {
    expect(isTime(time1)).toBeTruthy()
    expect(isTime(time2)).toBeTruthy()
    expect(isTime(time3)).toBeTruthy()
    expect(isTime(time4)).toBeTruthy()

    expect(isTime(dt1)).toBeFalsy()
    expect(isTime(dt2)).toBeFalsy()
    expect(isTime(invalidDate)).toBeFalsy()
  })

  it('parses time', () => {
    testDateTime(parseTime(time1), 1900, 1, 1, 18, 20, 30, 999)
    testDateTime(parseTime(time2), 1900, 1, 1, 18, 20, 30, 0)
    testDateTime(parseTime(time3), 1900, 1, 1, 18, 20, 0, 0)
    testDateTime(parseTime(time4), 1900, 1, 1, 18, 0, 0, 0)

    testDateTime(parseTime(time21), 1900, 1, 1, 18, 20, 30, 999)
    testDateTime(parseTime(time22), 1900, 1, 1, 18, 20, 30, 0)
    testDateTime(parseTime(time23), 1900, 1, 1, 18, 20, 0, 0)
    testDateTime(parseTime(time24), 1900, 1, 1, 18, 0, 0, 0)
  })
})
