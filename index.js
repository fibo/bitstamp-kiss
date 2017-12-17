const crypto = require('crypto')
const https = require('https')
const querystring = require('querystring')
const BITSTAMP_APIKEY = process.env.BITSTAMP_APIKEY
const BITSTAMP_APISECRET = process.env.BITSTAMP_APISECRET
const BITSTAMP_CUSTOMERID = process.env.BITSTAMP_CUSTOMERID
function coerceTick (tick) {
  return {
    high: parseFloat(tick.high),
    last: parseFloat(tick.last),
    timestamp: parseInt(tick.timestamp),
    bid: parseFloat(tick.bid),
    vwap: parseFloat(tick.vwap),
    volume: parseFloat(tick.volume),
    low: parseFloat(tick.low),
    ask: parseFloat(tick.ask),
    open: parseFloat(tick.open)
  }
}
function getNonce () {
  const now = new Date()

  const nonce = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()).getTime()

  return nonce + now.getUTCMilliseconds()
}
function getSignature (nonce) {
  const hmac = crypto.createHmac('sha256', BITSTAMP_APISECRET)

  const message = nonce + BITSTAMP_CUSTOMERID + BITSTAMP_APIKEY

  hmac.update(message)

  const signature = hmac.digest('hex').toUpperCase()

  return signature
}
function limitTo8Decimals (value) {
  const decimals = value.toString().split('.')[1]

  if (decimals && decimals.length > 8) {
    return value.toFixed(8)
  } else {
    return value
  }
}
function publicRequest (path, next) {
  https.get(`https://www.bitstamp.net/api${path}`, (response) => {
    const statusCode = response.statusCode

    if (statusCode !== 200) {
      const error = new Error(`Request failed with ${statusCode}`)

      response.resume()

      next(error)
    }

    response.setEncoding('utf8')

    let responseJSON = ''

    response.on('data', (chunk) => {
      responseJSON += chunk
    })

    response.on('end', () => {
      const responseData = JSON.parse(responseJSON)

      if (responseData.status === 'error') {
        const error = new Error(responseData.reason)
        error.code = responseData.code
        next(error)
      } else {
        next(null, responseData)
      }
    })
  })
}
function orderBook (currencyPair, next) {
  const path = `/v2/order_book/${currencyPair}/`

  publicRequest(path, next)
}

exports.orderBook = orderBook
/**
 * Returns data for the currency pair.
 *
 * @returns {Object} tick
 * @returns {String} tick.last Last currency price.
 * @returns {String} tick.high Last 24 hours price high.
 * @returns {String} tick.low Last 24 hours price low.
 * @returns {String} tick.vwap Last 24 hours [volume weighted average price](https://en.wikipedia.org/wiki/Volume-weighted_average_price).
 * @returns {String} tick.volume Last 24 hours volume.
 * @returns {String} tick.bid Highest buy order.
 * @returns {String} tick.ask Lowest sell order.
 * @returns {String} tick.timestamp Unix timestamp date and time.
 * @returns {String} tick.open First price of the day.
 */

function ticker (currencyPair, next) {
  const path = `/v2/ticker/${currencyPair}/`

  publicRequest(path, (err, data) => {
    next(err, coerceTick(data))
  })
}

exports.ticker = ticker
/**
 * @params {String} time The time interval from which we want the transactions to be returned. Possible values are minute, hour (default) or day.
 */

function transactions (currencyPair, time, next) {
  const path = `/v2/transactions/${currencyPair}/?time=${time}`

  publicRequest(path, next)
}

exports.transactions = transactions
function privateRequest (path, params, next) {
  const nonce = getNonce()
  const signature = getSignature(nonce)

  const requestData = querystring.stringify(Object.assign({}, params, {
    key: BITSTAMP_APIKEY,
    signature,
    nonce
  }))

  const requestOptions = {
    hostname: 'www.bitstamp.net',
    port: 443,
    path: `/api/${path}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': requestData.length,
      'Accept': 'application/json'
    }
  }

  const request = https.request(requestOptions, (response) => {
    response.setEncoding('utf8')

    let responseJSON = ''

    response.on('data', (chunk) => {
      responseJSON += chunk
    })

    response.on('end', () => {
      const responseData = JSON.parse(responseJSON)

      if (responseData.status === 'error') {
        const error = new Error(responseData.reason)
        error.code = responseData.code
        next(error)
      } else {
        next(null, responseData)
      }
    })
  })

  request.on('error', error => {
    next(error)
  })

  request.write(requestData)

  request.end()
}
function accountBalance (next) {
  privateRequest('/v2/balance/', {}, next)
}

exports.accountBalance = accountBalance
function allOpenOrders (currencyPair, next) {
  privateRequest('/v2/open_orders/all/', {}, next)
}

exports.allOpenOrders = allOpenOrders
function buyMarketOrder (currencyPair, amount, next) {
  const params = {
    amount: limitTo8Decimals(amount)
  }

  privateRequest(`/v2/buy/market/${currencyPair}/`, params, next)
}

exports.buyMarketOrder = buyMarketOrder
function openOrders (currencyPair, next) {
  privateRequest(`/v2/open_orders/${currencyPair}`, {}, next)
}

exports.openOrders = openOrders
function sellMarketOrder (currencyPair, amount, next) {
  const params = {
    amount: limitTo8Decimals(amount)
  }

  privateRequest(`/v2/sell/market/${currencyPair}/`, params, next)
}

exports.sellMarketOrder = sellMarketOrder
/**
 * Returns a descending list of transactions, represented as dictionaries.
 *
 * @param {Number} offset Skip that many transactions before returning results (default: 0).
 * @param {Number} limit Limit result to that many transactions (default: 100; maximum: 1000).
 * @param {Number} sort Sorting by date and time: asc - ascending; desc - descending (default: desc).
 */

function userTransactions (currencyPair, offset, limit, sort, next) {
  const params = {
    offset, limit, sort
  }

  privateRequest(`/v2/user_transactions/${currencyPair}/`, params, next)
}

exports.userTransactions = userTransactions
