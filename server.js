const express = require('express')
const mqtt = require('mqtt')
const { promisify } = require('util')
const { sequelize, Item } = require('./db')

function createApp (queue) {
  const app = express()

  app.use(express.json())

  app.post('/items', async (req, res) => {
    try {
      const item = await Item.build(req.body).save()
      res.status(200).json(item)
    } catch (err) {
      console.error(err)
      res.status(500).end()
    }
  })

  app.get('/items/:id', async (req, res) => {
    try {
      const { id } = req.params
      const item = await Item.findOne({
        attributes: ['id', 'name', 'messages'],
        where: { id }
      })
      if (item) {
        res.status(200).json(item)
      } else {
        res.status(404).end()
      }
    } catch (err) {
      console.error(err)
      res.status(500).end()
    }
  })

  app.post('/items/:id/messages', (req, res) => {
    const { id } = req.params
    const { message } = req.body
    queue.publish('topic', JSON.stringify({ id, message }), err => {
      if (!err) {
        res.status(200).end()
      } else {
        res.status(500).end()
      }
    })
  })

  return app
}

function initQueue () {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect('mqtt://mosquitto')
    client.on('connect', () => {
      client.on('message', async (topic, payload) => {
        console.log('Got:', payload.toString())
        try {
          const { id, message } = JSON.parse(payload)
          const item = await Item.findOne({
            attributes: ['id', 'name', 'messages'],
            where: { id }
          })
          if (!item.messages) {
            item.messages = message
          } else if (message) {
            item.messages = item.messages + ' ' + message
          }
          await item.save()
        } catch (err) {
          console.error(err)
        }
      })
      client.subscribe('topic', err => {
        if (!err) {
          resolve(client)
        } else {
          console.errror(`Couldn't subscribe`)
          reject(err)
        }
      })
    })
  })
}

class Server {
  async start (port) {
    await sequelize.sync()
    this.queue = await initQueue()
    const app = createApp(this.queue)
    this.server = app.listen(port, () => console.log(`Listening on ${port}.`))
  }

  stop () {
    const stopServer = this.server
      ? promisify(this.server.close).bind(this.server)()
      : Promise.resolve()
    const stopQueue = this.queue
      ? promisify(this.queue.end).bind(this.queue)()
      : Promise.resolve()
    return Promise.all([stopServer, stopQueue])
  }
}

module.exports = { Server }
