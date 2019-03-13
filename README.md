# bitstamp-kiss

> is a Bitstamp API v2 wrapper with the joy of kiss literate programming

[API](#api) |
[Annotated source](#annotated-source) |
[License](#license)

[![NPM version](https://badge.fury.io/js/bitstamp-kiss.svg)](http://badge.fury.io/js/bitstamp-kiss)
[![No deps](https://img.shields.io/badge/dependencies-none-green.svg)](https://github.com/fibo/bitstamp-kiss)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![KLP](https://img.shields.io/badge/kiss-literate-orange.svg)](http://g14n.info/kiss-literate-programming)

## API

The following methods are implemented:

* [Public API](#public-api)
  - [orderBook](#orderbook)
  - [ticker](#ticker)
  - [hourlyTicker](#hourlyticker)
  - [transactions](#transactions)
* [Private API](#private-api)
  - [accountBalance](#accountbalance)
  - [buyLimitOrder](#buylimitorder)
  - [buyMarketOrder](#buymarketorder)
  - [orderStatus](#orderstatus)
  - [sellLimitOrder](#selllimitorder)
  - [sellMarketOrder](#sellmarketorder)
  - [userTransactions](#usertransactions)
* [Helpers](#helpers)
  - [computeFee](#computefee)

## Annotated source

See [Bitstamp API](https://www.bitstamp.net/api/) as a reference.

```javascript
// This code is generated by command: npm run markdown2code
```

### Dependencies

Required dependencies are all core paackages.

```javascript
const crypto = require('crypto')
const https = require('https')
const querystring = require('querystring')
```

### Environment

Customer id is your Bitstamp username. You can get API key and secret going to
[Account > Settings > API Access](https://www.bitstamp.net/account/security/api/).

```javascript
const BITSTAMP_APIKEY = process.env.BITSTAMP_APIKEY
const BITSTAMP_APISECRET = process.env.BITSTAMP_APISECRET
const BITSTAMP_CUSTOMERID = process.env.BITSTAMP_CUSTOMERID
```

### Utils

#### coerceTick

Convert raw tick `Object<String>` into numeric values.

```javascript
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
```

#### getNonce

Get a unique progressive value. Current UTC timestamp is used, as usual.
It is also to return value in milliseconds, to make the nonce unique.

```javascript
function getNonce () {
  const now = new Date()

  const nonce = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()).getTime()

  return nonce + now.getUTCMilliseconds()
}
```

#### getSignature

```javascript
function getSignature (nonce) {
  const hmac = crypto.createHmac('sha256', BITSTAMP_APISECRET)

  const message = nonce + BITSTAMP_CUSTOMERID + BITSTAMP_APIKEY

  hmac.update(message)

  const signature = hmac.digest('hex').toUpperCase()

  return signature
}
```

#### limitTo5Decimals

Truncate value to avoid Bitstamp API errors on *sell limit order*.

```javascript
function limitTo5Decimals (value) {
  const decimals = value.toString().split('.')[1]

  if (decimals && decimals.length > 5) {
    return value.toFixed(5)
  } else {
    return value
  }
}
```

#### limitTo8Decimals

Truncate value to avoid Bitstamp API error:

> Ensure that there are no more than 8 decimal places.

```javascript
function limitTo8Decimals (value) {
  const decimals = value.toString().split('.')[1]

  if (decimals && decimals.length > 8) {
    return value.toFixed(8)
  } else {
    return value
  }
}
```

### Public API

#### publicRequest

```javascript
function publicRequest (path, next) {
  https.get(`https://www.bitstamp.net/api/${path}`, (response) => {
    const statusCode = response.statusCode

    if (statusCode !== 200) {
      const error = new Error(`Request failed with ${statusCode}`)

      response.resume()

      next(error)
    }

    response.setEncoding('utf8')

    let responseJSON = ''

    response.on('data', chunk => { responseJSON += chunk })

    response.on('end', () => {
      const responseData = JSON.parse(responseJSON)

      if (responseData.status === 'error') {
        const error = new Error(responseJSON)

        next(error)
      } else {
        next(null, responseData)
      }
    })
  }).on('error', next)
}
```

#### orderBook

> Returns a JSON dictionary like the ticker call, with the calculated values being from within an hour.

```javascript
function orderBook (currencyPair, next) {
  publicRequest(`v2/order_book/${currencyPair}/`, next)
}

exports.orderBook = orderBook
```

#### ticker

> Returns data for the given currency pair.

```javascript
/**
 * @param {String} currencyPair
 * @param {Function} next
 *
 * @returns {Object} tick
 * @returns {Number} tick.last Last currency price.
 * @returns {Number} tick.high Last 24 hours price high.
 * @returns {Number} tick.low Last 24 hours price low.
 * @returns {Number} tick.vwap Last 24 hours [volume weighted average price](https://en.wikipedia.org/wiki/Volume-weighted_average_price).
 * @returns {Number} tick.volume Last 24 hours volume.
 * @returns {Number} tick.bid Highest buy order.
 * @returns {Number} tick.ask Lowest sell order.
 * @returns {Number} tick.timestamp Unix timestamp date and time.
 * @returns {Number} tick.open First price of the day.
 */

function ticker (currencyPair, next) {
  publicRequest(`v2/ticker/${currencyPair}/`, (err, data) => {
    if (err) return next(err)

    next(null, coerceTick(data))
  })
}

exports.ticker = ticker
```

#### hourlyTicker

> Returns a JSON dictionary like the [ticker](#ticker) call, with the calculated values being from within an hour.

```javascript
function hourlyTicker (currencyPair, next) {
  publicRequest(`/v2/ticker_hour/${currencyPair}/`, (err, data) => {
    if (err) return next(err)

    next(null, coerceTick(data))
  })
}

exports.hourlyTicker = hourlyTicker
```

#### transactions

```javascript
/**
 * @param {currencyPair}
 * @param {String} time interval from which we want the transactions to be returned. Possible values are minute, hour (default) or day.
 * @params {Function} next
 */

function transactions (currencyPair, time, next) {
  const path = `v2/transactions/${currencyPair}/?time=${time}`

  publicRequest(path, next)
}

exports.transactions = transactions
```

### Private API

> These calls will be executed on the account (Sub or Main), to which the used API key is bound to.

#### privateRequest

```javascript
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
    const statusCode = response.statusCode

    if (statusCode !== 200) {
      const error = new Error(`Request failed with ${statusCode}`)

      response.resume()

      next(error)
    }

    response.setEncoding('utf8')

    let responseJSON = ''

    response.on('data', chunk => { responseJSON += chunk })

    response.on('end', () => {
      const responseData = JSON.parse(responseJSON)

      if (responseData.status === 'error') {
        const error = new Error(responseJSON)

        next(error)
      } else {
        next(null, responseData)
      }
    })
  })

  request.on('error', next)

  request.write(requestData)

  request.end()
}
```

#### accountBalance

> This API call is cached for 10 seconds.

```javascript
/**
 * @param {Function} next callback
 * @returns {Object} balance
 *
 * Balance
 *
 * @returns {Number} balance.usd_balance
 * @returns {Number} balance.btc_balance
 * @returns {Number} balance.eur_balance
 * @returns {Number} balance.xrp_balance
 * @returns {Number} balance.bch_balance
 * @returns {Number} balance.eth_balance
 * @returns {Number} balance.ltc_balance
 *
 * Reserved.
 *
 * @returns {Number} balance.usd_reserved
 * @returns {Number} balance.btc_reserved
 * @returns {Number} balance.eur_reserved
 * @returns {Number} balance.xrp_reserved
 * @returns {Number} balance.bch_reserved
 * @returns {Number} balance.eth_reserved
 * @returns {Number} balance.ltc_reserved
 *
 * Available for trading.
 *
 * @returns {Number} balance.usd_available
 * @returns {Number} balance.btc_available
 * @returns {Number} balance.eur_available
 * @returns {Number} balance.xrp_available
 * @returns {Number} balance.bch_available
 * @returns {Number} balance.eth_available
 * @returns {Number} balance.ltc_available
 *
 * Customer trading fees.
 *
 * @returns {Number} balance.bchbtc_fee
 * @returns {Number} balance.bcheur_fee
 * @returns {Number} balance.bchusd_fee
 * @returns {Number} balance.btceur_fee
 * @returns {Number} balance.btcusd_fee
 * @returns {Number} balance.ethbtc_fee
 * @returns {Number} balance.etheur_fee
 * @returns {Number} balance.ethusd_fee
 * @returns {Number} balance.eurusd_fee
 * @returns {Number} balance.ltcbtc_fee
 * @returns {Number} balance.ltceur_fee
 * @returns {Number} balance.ltcusd_fee
 * @returns {Number} balance.xrpbtc_fee
 * @returns {Number} balance.xrpeur_fee
 * @returns {Number} balance.xrpusd_fee
 */

function accountBalance (next) {
  privateRequest('v2/balance/', {}, (err, data) => {
    if (err) return next(err)

    next(null, {
      usd_balance: parseFloat(data.usd_balance),
      btc_balance: parseFloat(data.btc_balance),
      eur_balance: parseFloat(data.eur_balance),
      xrp_balance: parseFloat(data.xrp_balance),
      bch_balance: parseFloat(data.bch_balance),
      eth_balance: parseFloat(data.eth_balance),
      ltc_balance: parseFloat(data.ltc_balance),
      usd_reserved: parseFloat(data.usd_reserved),
      btc_reserved: parseFloat(data.btc_reserved),
      eur_reserved: parseFloat(data.eur_reserved),
      xrp_reserved: parseFloat(data.xrp_reserved),
      bch_reserved: parseFloat(data.bch_reserved),
      eth_reserved: parseFloat(data.eth_reserved),
      ltc_reserved: parseFloat(data.ltc_reserved),
      usd_available: parseFloat(data.usd_available),
      btc_available: parseFloat(data.btc_available),
      eur_available: parseFloat(data.eur_available),
      xrp_available: parseFloat(data.xrp_available),
      bch_available: parseFloat(data.bch_available),
      eth_available: parseFloat(data.eth_available),
      ltc_available: parseFloat(data.ltc_available),
      bchbtc_fee: parseFloat(data.bchbtc_fee),
      bcheur_fee: parseFloat(data.bcheur_fee),
      bchusd_fee: parseFloat(data.bchusd_fee),
      btceur_fee: parseFloat(data.btceur_fee),
      btcusd_fee: parseFloat(data.btcusd_fee),
      ethbtc_fee: parseFloat(data.ethbtc_fee),
      etheur_fee: parseFloat(data.etheur_fee),
      ethusd_fee: parseFloat(data.ethusd_fee),
      eurusd_fee: parseFloat(data.eurusd_fee),
      ltcbtc_fee: parseFloat(data.ltcbtc_fee),
      ltceur_fee: parseFloat(data.ltceur_fee),
      ltcusd_fee: parseFloat(data.ltcusd_fee),
      xrpbtc_fee: parseFloat(data.xrpbtc_fee),
      xrpeur_fee: parseFloat(data.xrpeur_fee),
      xrpusd_fee: parseFloat(data.xrpusd_fee)
    })
  })
}

exports.accountBalance = accountBalance
```

#### buyLimitOrder

> This call will be executed on the account (Sub or Main), to which the used API key is bound to.

```javascript
/**
 * @param {currencyPair}
 * @param {Object} param
 * @param {Number} param.amount
 * @param {Number} param.price
 * @param {Number} param.limit_price If the order gets executed, a new sell order will be placed, with "limit_price" as its price.
 * @param {Function} next callback
 * @returns {Object} response
 * @returns {Number} response.id Order ID.
 * @returns {String} response.datetime
 * @returns {String} response.type 0 (buy) or 1 (sell).
 * @returns {Number} response.price
 * @returns {Number} response.amount
 */
function buyLimitOrder (currencyPair, param, next) {
  if (param.limit_price <= param.price) {
    next(new Error('limit_price <= price'))
  }

  const params = {
    amount: limitTo5Decimals(param.amount),
    price: limitTo5Decimals(param.price),
    limit_price: limitTo5Decimals(param.limit_price)
  }

  privateRequest(`v2/buy/${currencyPair}/`, params, (err, data) => {
    if (err) return next(err)

    next(null, {
      id: parseInt(data.id),
      datetime: data.datetime,
      type: data.type,
      price: parseFloat(data.price),
      amount: parseFloat(data.amount)
    })
  })
}

exports.buyLimitOrder = buyLimitOrder
```

#### buyMarketOrder

> By placing a market order you acknowledge that the execution of your order depends on the market conditions and that these conditions may be subject to sudden changes that cannot be foreseen.

```javascript
/**
 * @param {currencyPair}
 * @param {Number} amount
 * @param {Function} next callback
 * @returns {Object} response
 * @returns {Number} response.id Order ID.
 * @returns {String} response.datetime
 * @returns {String} response.type 0 (buy) or 1 (sell).
 * @returns {Number} response.price
 * @returns {Number} response.amount
 */
function buyMarketOrder (currencyPair, amount, next) {
  const params = {
    amount: limitTo8Decimals(amount)
  }

  privateRequest(`v2/buy/market/${currencyPair}/`, params, (err, data) => {
    if (err) return next(err)

    next(null, {
      id: parseInt(data.id),
      datetime: data.datetime,
      type: data.type,
      price: parseFloat(data.price),
      amount: parseFloat(data.amount)
    })
  })
}

exports.buyMarketOrder = buyMarketOrder
```

#### sellLimitOrder

> This call will be executed on the account (Sub or Main), to which the used API key is bound to.

Note that *daily_order* param is not supported, since Bistamp API complains with error

> Both limit_price and any optional parameter cannot be set.

```javascript
/**
 * @param {currencyPair}
 * @param {Object} param
 * @param {Number} param.amount
 * @param {Number} param.price
 * @param {Number} param.limit_price If the order gets executed, a new buy order will be placed, with "limit_price" as its price.
 * @param {Function} next callback
 * @returns {Object} response
 * @returns {Number} response.id Order ID.
 * @returns {String} response.datetime
 * @returns {String} response.type 0 (buy) or 1 (sell).
 * @returns {Number} response.price
 * @returns {Number} response.amount
 */
function sellLimitOrder (currencyPair, param, next) {
  if (param.limit_price >= param.price) {
    next(new Error('limit_price >= price'))
  }

  const params = {
    amount: limitTo5Decimals(param.amount),
    price: limitTo5Decimals(param.price),
    limit_price: limitTo5Decimals(param.limit_price)
  }

  privateRequest(`v2/sell/${currencyPair}/`, params, (err, data) => {
    if (err) return next(err)

    next(null, {
      id: parseInt(data.id),
      datetime: data.datetime,
      type: data.type,
      price: parseFloat(data.price),
      amount: parseFloat(data.amount)
    })
  })
}

exports.sellLimitOrder = sellLimitOrder
```

#### sellMarketOrder

> By placing a market order you acknowledge that the execution of your order depends on the market conditions and that these conditions may be subject to sudden changes that cannot be foreseen.
> This call will be executed on the account (Sub or Main), to which the used API key is bound to.

```javascript
/**
 * @param {currencyPair}
 * @param {Number} amount
 * @param {Function} next callback
 * @returns {Object} response
 * @returns {Number} response.id Order ID.
 * @returns {String} response.datetime
 * @returns {String} response.type 0 (buy) or 1 (sell).
 * @returns {Number} response.price
 * @returns {Number} response.amount
 */
function sellMarketOrder (currencyPair, amount, next) {
  const params = {
    amount: limitTo8Decimals(amount)
  }

  privateRequest(`v2/sell/market/${currencyPair}/`, params, (err, data) => {
    if (err) return next(err)

    next(null, {
      id: parseInt(data.id),
      datetime: data.datetime,
      type: data.type,
      price: parseFloat(data.price),
      amount: parseFloat(data.amount)
    })
  })
}

exports.sellMarketOrder = sellMarketOrder
```

#### userTransactions

> Returns a descending list of transactions, represented as dictionaries.

For example, to get latest 100 BTC/USD market trade transactions

```js
bitstamp.userTransactions('btcusd', 0, 100, 'desc', (err, transactions) => {
  if (err) throw err

  const marketTradeTransactions = transactions.filter(
    ({type}) => type === '2'
  )

  console.log(marketTradeTransactions)
})
```

The *currencyPair* parameter can be also `all` to get transactions for all currency pairs.

```javascript
/**
 * @param {currencyPair}
 * @param {Number} offset to skip that many transactions before returning results (default: 0).
 * @param {Number} limit result to that many transactions (default: 100; maximum: 1000).
 * @param {Number} sort Sorting by date and time: asc - ascending; desc - descending (default: desc).
 * @param {Function} next callback
 *
 * @returns {Array} transactions
 *
 * Every transaction has the following properties:
 *
 * @prop {String} datetime
 * @prop {Number} id
 * @prop {String} type 0 - deposit; 1 - withdrawal; 2 - market trade; 14 - sub account transfer
 * @prop {Number} usd
 * @prop {Number} eur
 * @prop {Number} btc
 * @prop {Number} xrp
 * @prop {Number} btc_usd exchange rate (if available)
 * @prop {Number} xrp_usd exchange rate (if available)
 * @prop {Number} btc_eur exchange rate (if available)
 * @prop {Number} xrp_eur exchange rate (if available)
 * @prop {Number} fee
 * @prop {Number} order_id
 */

function userTransactions (currencyPair, offset, limit, sort, next) {
  const params = { offset, limit, sort }

  const path = currencyPair === 'all' ? 'v2/user_transactions/' : `v2/user_transactions/${currencyPair}/`

  privateRequest(path, params, (err, data) => {
    if (err) return next(err)

    next(null, data.map(data => {
      const { datetime, id, type } = data

      const transaction = { datetime, id, type }

      if (data.fee) transaction.fee = parseFloat(data.fee)
      if (data.order_id) transaction.order_id = data.order_id

      const currencies = ['btc', 'eur', 'xrp', 'usd']

      currencies.forEach(currency => {
        if (data[currency]) transaction[currency] = parseFloat(data[currency])
      })

      const exchangeRateLabel = Object.keys(data).find(key => (
        key.length === 7 && key.charAt(3) === '_'
      ))

      transaction[exchangeRateLabel] = parseFloat(data[exchangeRateLabel])

      const currency1 = exchangeRateLabel.substring(0, 3)
      const currency2 = exchangeRateLabel.substring(4)

      transaction[currency1] = parseFloat(data[currency1])
      transaction[currency2] = parseFloat(data[currency2])

      return transaction
    }))
  })
}

exports.userTransactions = userTransactions
```

### Helpers

#### computeFee

```javascript
/**
 * @param {Number} value
 *
 * @returns {Number} fee
 */
function computeFee (value) {
  const percentage = 0.25

  const fee = value * percentage / 100 // 0.25%

  return Math.ceil(fee * 100) / 100 // rounded to two decimals
}

exports.computeFee = computeFee
```

## License

[MIT](http://g14n.info/mit-license/)

