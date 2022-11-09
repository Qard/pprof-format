/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the MIT License.
 * 
 * This product includes software developed at Datadog (https://www.datadoghq.com/  Copyright 2022 Datadog, Inc.
 */

import tap from 'tap'
import type Tap from 'tap'

import {
  Function,
  Label,
  Line,
  Location,
  Mapping,
  Profile,
  Sample,
  ValueType,
  StringTable
} from './index.js'

type Data = {
  [key: string]: any
}

type Encoding = {
  field: string
  value: string
}

interface TestSuite extends Tap.Test {
  constructs(Type: any, data: Data, encodings: Encoding[], message?: string): void
  encodes(Type: any, data: Data, encodings: Encoding[], message?: string): void
  decodes(Type: any, data: Data, encodings: Encoding[], message?: string): void
}

tap.Test.prototype.addAssert('constructs', 3, function (Type: any, data: Data, encodings: Encoding[], message: string) {
  message = message || 'construction'

  return this.test(message, (t: TestSuite) => {
    const value = new Type(data)
    for (const { field } of encodings) {
      if (typeof data[field] === 'object') {
        t.has(value[field], data[field], `has given ${field}`)
      } else {
        t.equal(value[field], data[field], `has given ${field}`)
      }
    }
    t.end()
  })
})

tap.Test.prototype.addAssert('encodes', 3, function (Type: any, data: Data, encodings: Encoding[], message: string) {
  message = message || 'encoding'

  return this.test(message, (t: TestSuite) => {
    t.test('per-field validation', (t2: TestSuite) => {
      for (const { field, value } of encodings) {
        const fun = new Type({ [field]: data[field] })
        const msg = `has expected encoding of ${field} field`
        t2.equal(bufToHex(fun.encode()), value, msg)
      }
      t2.end()
    })

    t.test('full object validation', (t2: TestSuite) => {
      const fun = new Type(data)
      t2.equal(
        bufToHex(fun.encode()),
        fullEncoding(encodings),
        'has expected encoding of full object'
      )
      t2.end()
    })

    t.end()
  })
})

tap.Test.prototype.addAssert('decodes', 3, function (Type: any, data: Data, encodings: Encoding[], message: string) {
  message = message || 'decoding'

  return this.test(message, (t: TestSuite) => {
    t.test('per-field validation', (t2: TestSuite) => {
      for (const { field, value } of encodings) {
        if (!value) continue
        const fun = Type.decode(hexToBuf(value))
        const msg = `has expected decoding of ${field} field`
        t2.has(fun, { [field]: data[field] }, msg)
      }
      t2.end()
    })

    t.test('full object validation', (t2: TestSuite) => {
      const fun = Type.decode(hexToBuf(fullEncoding(encodings)))
      t2.has(fun, data, 'has expected encoding of full object')
      t2.end()
    })

    t.end()
  })
})

const stringTable = new StringTable()

const functionData = {
  id: 123,
  name: stringTable.dedup('fn name'),
  systemName: stringTable.dedup('fn systemName'),
  filename: stringTable.dedup('fn filename'),
  startLine: 789
}

const functionEncodings = [
  { field: 'id', value: '087b' },
  { field: 'name', value: '1001' },
  { field: 'systemName', value: '1802' },
  { field: 'filename', value: '2003' },
  { field: 'startLine', value: '289506' }
]

tap.test('Function', (t: TestSuite) => {
  t.constructs(Function, functionData, functionEncodings)
  t.encodes(Function, functionData, functionEncodings)
  t.decodes(Function, functionData, functionEncodings)
  t.end()
})

const labelData = {
  key: stringTable.dedup('label key'),
  str: stringTable.dedup('label str'),
  num: 123,
  numUnit: stringTable.dedup('label numUnit')
}

const labelEncodings = [
  { field: 'key', value: '0804' },
  { field: 'str', value: '1005' },
  { field: 'num', value: '187b' },
  { field: 'numUnit', value: '2006' }
]

tap.test('Label', (t: TestSuite) => {
  t.constructs(Label, labelData, labelEncodings)
  t.encodes(Label, labelData, labelEncodings)
  t.decodes(Label, labelData, labelEncodings)
  t.end()
})

const lineData = {
  functionId: 1234,
  line: 5678
}

const lineEncodings = [
  { field: 'functionId', value: '08d209' },
  { field: 'line', value: '10ae2c' },
]

tap.test('Line', (t: TestSuite) => {
  t.constructs(Line, lineData, lineEncodings)
  t.encodes(Line, lineData, lineEncodings)
  t.decodes(Line, lineData, lineEncodings)
  t.end()
})

const locationData = {
  id: 12,
  mappingId: 34,
  address: 56,
  line: [lineData],
  isFolded: true
}

const locationEncodings = [
  { field: 'id', value: '080c' },
  { field: 'mappingId', value: '1022' },
  { field: 'address', value: '1838' },
  { field: 'line', value: embeddedField('22', lineEncodings) },
  { field: 'isFolded', value: '2801' },
]

tap.test('Location', (t: TestSuite) => {
  t.constructs(Location, locationData, locationEncodings)
  t.encodes(Location, locationData, locationEncodings)
  t.decodes(Location, locationData, locationEncodings)
  t.end()
})

const mappingData = {
  id: 1,
  memoryStart: 2,
  memoryLimit: 3,
  fileOffset: 4,
  filename: stringTable.dedup('mapping filename'),
  buildId: stringTable.dedup('mapping build id'),
  hasFunctions: true,
  hasFilenames: true,
  hasLineNumbers: true,
  hasInlineFrames: true,
}

const mappingEncodings = [
  { field: 'id', value: '0801' },
  { field: 'memoryStart', value: '1002' },
  { field: 'memoryLimit', value: '1803' },
  { field: 'fileOffset', value: '2004' },
  { field: 'filename', value: '2807' },
  { field: 'buildId', value: '3008' },
  { field: 'hasFunctions', value: '3801' },
  { field: 'hasFilenames', value: '4001' },
  { field: 'hasLineNumbers', value: '4801' },
  { field: 'hasInlineFrames', value: '5001' },
]

tap.test('Mapping', (t: TestSuite) => {
  t.constructs(Mapping, mappingData, mappingEncodings)
  t.encodes(Mapping, mappingData, mappingEncodings)
  t.decodes(Mapping, mappingData, mappingEncodings)
  t.end()
})

const sampleData = {
  locationId: [1, 2, 3],
  value: [4, 5, 0, 6],
  label: [labelData]
}

const sampleEncodings = [
  { field: 'locationId', value: '0a03010203' },
  { field: 'value', value: '120404050006' },
  { field: 'label', value: embeddedField('1a', labelEncodings) },
]

tap.test('Sample', (t: TestSuite) => {
  t.constructs(Sample, sampleData, sampleEncodings)
  t.encodes(Sample, sampleData, sampleEncodings)
  t.decodes(Sample, sampleData, sampleEncodings)
  t.end()
})

const valueTypeData = {
  type: stringTable.dedup('value type type'),
  unit: stringTable.dedup('value type unit')
}

const valueTypeEncodings = [
  { field: 'type', value: '0809' },
  { field: 'unit', value: '100a' },
]

tap.test('ValueType', (t: TestSuite) => {
  t.constructs(ValueType, valueTypeData, valueTypeEncodings)
  t.encodes(ValueType, valueTypeData, valueTypeEncodings)
  t.decodes(ValueType, valueTypeData, valueTypeEncodings)
  t.end()
})

const profileData = {
  sampleType: [valueTypeData],
  sample: [sampleData],
  mapping: [mappingData],
  location: [locationData],
  function: [functionData],
  stringTable,
  timeNanos: 1_000_000n,
  durationNanos: 1234,
  periodType: valueTypeData,
  period: 1234 / 2,
  comment: [
    stringTable.dedup('some comment')
  ]
}

const profileEncodings = [
  { field: 'sampleType', value: embeddedField('0a', valueTypeEncodings) },
  { field: 'sample', value: embeddedField('12', sampleEncodings) },
  { field: 'mapping', value: embeddedField('1a', mappingEncodings) },
  { field: 'location', value: embeddedField('22', locationEncodings) },
  { field: 'function', value: embeddedField('2a', functionEncodings) },
  { field: 'stringTable', value: encodeStringTable(stringTable) },
  { field: 'timeNanos', value: '48c0843d' },
  { field: 'durationNanos', value: '50d209' },
  { field: 'periodType', value: embeddedField('5a', valueTypeEncodings) },
  { field: 'period', value: '60e904' },
  { field: 'comment', value: '6a010b' },
]

tap.test('Profile', (t: TestSuite) => {
  t.constructs(Profile, profileData, profileEncodings)
  t.encodes(Profile, profileData, profileEncodings)
  t.decodes(Profile, profileData, profileEncodings)
  t.end()
})

function encodeStringTable(strings: StringTable) {
  return strings.slice(1).map(s => {
    const buf = new TextEncoder().encode(s)
    return `32${hexNum(buf.length)}${bufToHex(buf)}`
  }).join('')
}

function hexNum(num: number) {
  let str = num.toString(16)
  if (str.length % 2) str = '0' + str
  return str
}

function embeddedField(fieldBit: string, data: Encoding[]) {
  const encoded = fullEncoding(data)
  const size = hexNum(encoded.length / 2)
  return [fieldBit, size, encoded].join('')
}

function fullEncoding(encodings: Encoding[]) {
  return encodings.map(e => e.value).join('')
}

function hexToBuf(hex: string) {
  return Uint8Array.from((hex.match(/.{2}/g) || []).map(v => parseInt(v, 16)))
}

function bufToHex(buf: Uint8Array) {
  return Array.from(buf).map(hexNum).join('')
}
