#!/usr/bin/env node

const { Server } = require('./server')

if (require.main === module) {
  const server = new Server
  server.start(8000)
}
