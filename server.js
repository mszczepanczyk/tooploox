const express = require('express')
const mqtt = require('mqtt')
const { sequelize, Item } = require('./db')

function createApp (queue) {
  const app = express()

  app.use(express.json())

  app.post('/items', async (req, res) => {
    await Item.build(req.body).save().then(item => {
      res.status(200).json(item)
    }).catch(err => {
      console.error(err)
      res.status(500).end()
    })
  })

  app.get('/items/:id', async (req, res) => {
    const { id } = req.params
    Item.findOne({
      attributes: ['id', 'name', 'messages'],
      where: { id }
    }).then(item => {
      if (item) {
        res.status(200).json(item)
      } else {
        res.status(404).end()
      }
    }).catch(err => {
      console.error(err)
      res.status(500).end()
    })
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
          await Item.findOne({
            attributes: ['id', 'name', 'messages'],
            where: { id }
          }).then(item => {
            item.messages = (item.messages || '') + message
            return item.save()
          })
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
      ? new Promise(resolve => this.server.close(resolve))
      : Promise.resolve()
    const stopQueue = this.queue
      ? new Promise((resolve, reject) => this.queue.end(err => !err ? resolve() : reject(err)))
      : Promise.resolve()
    return Promise.all([stopServer, stopQueue])
  }
}

module.exports = { Server }
