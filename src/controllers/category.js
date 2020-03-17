const Category = require('../models/category');

// @route GET api/category
// @desc Returns all categories
// @access Public
exports.index = async function (req, res) {
    const categories = await Category.find({});
    res.status(200).json({categories});
};


// @route POST api/category
// @desc Add a new category
// @access Public
exports.store = async (req, res) => {
    try {
        const newCategory = new Category({...req.body});

        const category = await newCategory.save();

        res.status(200).json({category, message: 'Category added successfully'});
    } catch (error) {
        res.status(500).json({success: false, message: error.message})
    }
};

// @route GET api/category/{id}
// @desc Returns a specific category
// @access Public
exports.show = async function (req, res) {
    try {
        const id = req.params.id;

        const category = await Category.findById(id);

        if (!category) return res.status(401).json({message: 'Category does not exist'});

        res.status(200).json({category});
    } catch (error) {
        res.status(500).json({message: error.message})
    }
};

// @route PUT api/category/{id}
// @desc Update category details
// @access Public
exports.update = async function (req, res) {
    try {
        const update = req.body;
        const id = req.params.id;

        const category = await Category.findByIdAndUpdate(id, {$set: update}, {new: true});

        res.status(200).json({category, message: 'Category has been updated'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

// @route DESTROY api/category/{id}
// @desc Delete Category
// @access Public
exports.destroy = async function (req, res) {
    try {
        const id = req.params.id;

        await Category.findByIdAndDelete(id);

        res.status(200).json({message: 'Category has been deleted'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

/**
 * Seed the database -  //For testing purpose only
 */
exports.seed = async function (req, res) {
    let categories = [];
    let categories_ = ["Comedy", "Concerts","Festivals", "Nightlife", "Sport", "Theatre"];

    try {
        //Create 5 events for each user
        for (let j = 0; j < categories_.length; j++) {

            const newCategory = new Category({name: categories_[j], order: j});
            let category = newCategory.save();
            categories.push(category);
        }

        res.status(200).json({categories, message: 'Database seeded!'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }

};