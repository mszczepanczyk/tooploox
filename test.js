const fetch = require('node-fetch')
const { Server } = require('./server')

const port = 8000
const server = new Server

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

beforeAll(async () => {
  await server.start(port)
})

test('can add an item', async () => {
  const response = await fetch(`http://localhost:${port}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: 1,
      name: 'foo'
    })
  })
  expect(response.ok).toBe(true)
})

test('can add a message', async () => {
  const response = await fetch(`http://localhost:${port}/items/1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'bar'
    })
  })
  expect(response.ok).toBe(true)
})

test('sleep to wait for message to be processed (a bit hacky)', async () => {
  await sleep(1000)
})

test('can get an item', async () => {
  const response = await fetch(`http://localhost:${port}/items/1`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  expect(response.ok).toBe(true)
  const item = await response.json()

  expect(item).toEqual({ id: 1, name: 'foo', messages: 'bar' })
})

afterAll(async () => {
  await server.stop()
})
