proxyquire = require 'proxyquire'
suite = require '../src/suite'
utils = require '../src/utils'

report = proxyquire '../src/report', {
  './suite': -> {
    #
  }
}

describe 'report() tests', ->
  it 'prints separator line', ->


