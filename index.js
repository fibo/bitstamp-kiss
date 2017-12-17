function getNonce () {
  const now = new Date()

  const nonce = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()).getTime()

  return nonce + now.getUTCMilliseconds()
}
