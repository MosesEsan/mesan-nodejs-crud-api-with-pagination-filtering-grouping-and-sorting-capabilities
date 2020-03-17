const mongoose = require('mongoose');
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: 'Category name is required',
    },

    order: {
        type: Number,
        required: false,
        default: 0
    },

}, {timestamps: true});

CategorySchema.plugin(aggregatePaginate);
module.exports = mongoose.model('Categories', CategorySchema);