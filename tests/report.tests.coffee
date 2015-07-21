proxyquire = require 'proxyquire'
suite = require '../suite'
utils = require '../utils'

report = proxyquire '../report', {
  './suite': -> {
    #
  }
}

describe 'report() tests', ->
  it 'prints separator line', ->


