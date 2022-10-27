// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for examples
const Pizza = require('../models/pizza')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

router.get('/pizzas', requireToken, (req, res, next) => {
	Pizza.find()
		.then(pizzas => {
			return pizzas.map(pizza => pizza)
		})
		.then(pizzas =>{
			res.status(200).json({ pizzas: pizzas })
		})
		.catch(next)
})
//show 

router.get('/pizzas/:id', requireToken, (req, res, next) => {
    Pizza.findById(req.params.id)
    .then(handle404)
    .then(pizza => {
        res.status(200).json({ pizza: pizza })
    })
    .catch(next)

})
// Create
// /pizza
router.post('/pizzas', requireToken, (req, res, next) => {
    req.body.pizza.owner = req.user.id

    // one the front end I HAVE TO SEND a pizza as the top level key
    // pizza: {name: '', type: ''}
    Pizza.create(req.body.pizza)
    .then(pizza => {
        res.status(201).json({ pizza: pizza })
    })
    .catch(next)
    // .catch(error => next(error))

})

router.patch('/pizzas/:id', requireToken, removeBlanks, (req, res, next) => {
    delete req.body.pizza.owner

    Pizza.findById(req.params.id)
    .then(handle404)
    .then(pizza => {
        requireOwnership(req, pizza)

        return pizza.updateOne(req.body.pizza)
    })
    .then(() => res.sendStatus(204))
    .catch(next)
})

router.delete('/pizzas/:id', requireToken, (req, res, next) => {
	Pizza.findById(req.params.id)
		.then(handle404)
		.then((pizza) => {
			requireOwnership(req, pizza)
			pizza.deleteOne()
		})
		
		.then(() => res.sendStatus(204))
		
		.catch(next)
})


module.exports = router