const { Sequelize, Model, DataTypes } = require('sequelize')

const sequelize = new Sequelize('sqlite::memory:')

class Item extends Model {}
Item.init({
  name: DataTypes.STRING,
  messages: DataTypes.STRING
}, {
  sequelize,
  modelName: 'item'
})

module.exports = { sequelize, Item }
