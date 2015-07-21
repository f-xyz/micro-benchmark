proxyquire = require 'proxyquire'
suite = require '../suite'
{ formatNumber, pad, padLeft } = require '../utils'

report = proxyquire '../report', {
  './suite': -> {

  }
}

describe 'report()', ->

