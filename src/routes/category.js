const express = require('express');
const {check} = require('express-validator');

const Category = require('../controllers/category');

const router = express.Router();

const validate = require('../middlewares/validate');

//SEED
router.get('/seed', Category.seed);

//INDEX
router.get('/', Category.index);

//STORE
router.post('/', [
    check('name').not().isEmpty().withMessage('Name is required')
], validate, Category.store);

//SHOW
router.get('/:id',  Category.show);

//UPDATE
router.put('/:id',  Category.update);

//DELETE
router.delete('/:id', Category.destroy);

module.exports = router;

