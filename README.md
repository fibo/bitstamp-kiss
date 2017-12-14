# bitstamp-kiss

> is a Bitstamp API v2 wrapper with the joy of kiss literate programming

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Annotated source

### getNonce

Get a unique progressive value. Current UTC timestamp is used, as usual.
It is also to return value in milliseconds, to make the nonce unique.

```javascript
function getNonce () {
  const now = new Date()

  const nonce = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()).getTime()

  return nonce + now.getUTCMilliseconds()
}
```

## License

[MIT](http://g14n.info/mit-license/)

