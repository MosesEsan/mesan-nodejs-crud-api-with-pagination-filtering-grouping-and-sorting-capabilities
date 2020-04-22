const faker = require('faker'); //For testing purpose only
const moment = require('moment');
const mongoose = require('mongoose');

const Category = require('../models/category');
const User = require('../models/user');
const Event = require('../models/event');
const {uploader} = require('../utils/index');

const limit_ = 5;

//Get Popular Events
const getPopularEvents = async function () {
    let aggregate_options = [];

    //PAGINATION -- set the options for pagination
    const options = {
        page: 1,
        collation: {locale: 'en'},
        customLabels: {
            totalDocs: 'totalResults',
            docs: 'events'
        }
    };

    //2
    //LOOKUP/JOIN -- SECOND STAGE
    //FIRST JOIN  -- Category ===================================
    // Here we use $lookup(aggregation) to get the relationship from event to categories (one to many).
    aggregate_options.push({
        $lookup: {
            from: 'categories',
            localField: "category",
            foreignField: "_id",
            as: "categories"
        }
    });
    //deconstruct the $purchases array using $unwind(aggregation).
    aggregate_options.push({$unwind: {path: "$categories", preserveNullAndEmptyArrays: true}});

    //4
    //FILTER BY DATE -- FOURTH STAGE
    aggregate_options.push({
        $match: {"start_date": {$gte: new Date()}}
    });

    //5
    //SORTING -- FIFTH STAGE - SORT BY DATE
    aggregate_options.push({
        $sort: {"start_date": -1, "_id": -1}
    });

    //SELECT FIELDS
    aggregate_options.push({
        $project: {
            _id: 1,
            userId: 1,
            name: 1,
            location: 1,
            start_date: 1,
            end_date: 1,
            description: 1,
            category: { $ifNull: [ "$categories._id", null ] },
            category_name: { $ifNull: [ "$categories.name", null ] },
            image: 1,
            createdAt: 1
        }
    });

    aggregate_options.push({
        $sample: { size: 5 }
    });

    // Set up the aggregation
    const myAggregate = Event.aggregate(aggregate_options);
    const result = await Event.aggregatePaginate(myAggregate, options);

    return result.events;
};

// @route GET api/event
// @desc Returns all events with pagination
// @access Public
exports.index = async function (req, res) {
    let aggregate_options = [];
    let group = (req.query.group !== 'false' && parseInt(req.query.group) !== 0);
    let search = !!(req.query.q);
    let match_regex = {$regex: req.query.q, $options: 'i'}; //use $regex in mongodb - add the 'i' flag if you want the search to be case insensitive.

    //PAGINATION -- set the options for pagination
    const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || limit_,
        collation: {locale: 'en'},
        customLabels: {
            totalDocs: 'totalResults',
            docs: 'events'
        }
    };

    //1
    //FILTERING AND PARTIAL TEXT SEARCH -- FIRST STAGE
    if (search) aggregate_options.push({$match: {"name": match_regex}});

    //2
    //LOOKUP/JOIN -- SECOND STAGE
    //FIRST JOIN  -- Category ===================================
    // Here we use $lookup(aggregation) to get the relationship from event to categories (one to many).
    aggregate_options.push({
        $lookup: {
            from: 'categories',
            localField: "category",
            foreignField: "_id",
            as: "categories"
        }
    });
    //deconstruct the $purchases array using $unwind(aggregation).
    aggregate_options.push({$unwind: {path: "$categories", preserveNullAndEmptyArrays: true}});

    //3a
    //FILTER BY USERID -- SECOND STAGE - use mongoose.Types.ObjectId() to recreate the moogoses object id
    if (req.query.user) {
        aggregate_options.push({
            $match: {
                userId: mongoose.Types.ObjectId(req.query.user)
            }
        });
    }

    //3b
    //FILTER BY Category -- THIRD STAGE - use mongoose.Types.ObjectId() to recreate the moogoses object id
    if (req.query.category) {
        aggregate_options.push({
            $match: {
                category: mongoose.Types.ObjectId(req.query.category)
            }
        });
    }


    //3c
    //FILTER BY EventID -- THIRD STAGE - use mongoose.Types.ObjectId() to recreate the moogoses object id
    if (req.query.id) {
        aggregate_options.push({
            $match: {
                _id: mongoose.Types.ObjectId(req.query.id)
            }
        });
    }

    //4
    //FILTER BY DATE -- FOURTH STAGE
    if (req.query.start) {
        let start = moment(req.query.start).startOf('day');
        let end = moment(req.query.start).endOf('day'); // add 1 day

        if (req.query.end) end = req.query.end;

        aggregate_options.push({
            $match: {"start_date": {$gte: new Date(start), $lte: new Date(end)}}
        });

    }else if (req.query.end) {
        aggregate_options.push({
            $match: {"start_date": {$lte: new Date(req.query.end)}}
        });
    }else if (!search){
        aggregate_options.push({
            $match: {"start_date": {$gte: new Date()}}
        });
    }

    //5
    //SORTING -- FIFTH STAGE
    let sort_order = req.query.sort_order && req.query.sort_order === 'asc' ? 1 : -1;
    let sort_by = req.query.sort_by || "start_date";
    aggregate_options.push({
        $sort: {
            [sort_by]: sort_order,
            "_id": -1
        },
    });

    //SELECT FIELDS
    aggregate_options.push({
        $project: {
            _id: 1,
            userId: 1,
            name: 1,
            location: 1,
            start_date: 1,
            end_date: 1,
            description: 1,
            category: { $ifNull: [ "$categories._id", null ] },
            category_name: { $ifNull: [ "$categories.name", null ] },
            image: 1,
            createdAt: 1
        }
    });

    //6
    //GROUPING -- LAST STAGE
    if (group) {
        aggregate_options.push({
            $group: {
                _id: {$dateToString: {format: "%Y-%m-%d", date: "$start_date"}},
                data: {$push: "$$ROOT"}
            }
        });
        aggregate_options.push({
            $sort: {
                "data.start_date": req.query.sort_order && req.query.sort_order === 'asc' ? 1 : -1
            }
        });
    }
    // END GROUPING ===================================

    // Set up the aggregation
    const myAggregate = Event.aggregate(aggregate_options);
    const result = await Event.aggregatePaginate(myAggregate, options);

    const categories = await Category.find({});
    result["categories"] = categories;
    result["popular"] = await getPopularEvents();
    result["grouped"] = group;
    res.status(200).json(result);
};


// @route POST api/event
// @desc Add a new event
// @access Public
exports.store = async (req, res) => {
    try {
        const userId = req.user._id;
        const newEvent = new Event({...req.body, userId});

        const event = await newEvent.save();

        //if there is no image, return success message
        if (!req.file) return res.status(200).json({event, message: 'Event added successfully'});

        //Attempt to upload to cloudinary
        const result = await uploader(req);
        const event_ = await Event.findByIdAndUpdate(event._id, {$set: {image: result.url}}, {new: true});

        res.status(200).json({event: event_, message: 'Event added successfully'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

// @route GET api/event/{id}
// @desc Returns a specific event
// @access Public
exports.show = async function (req, res) {
    try {
        const id = req.params.id;

        const event = await Event.findById(id);

        if (!event) return res.status(401).json({message: 'Event does not exist'});

        res.status(200).json({event});
    } catch (error) {
        res.status(500).json({message: error.message})
    }
};

// @route PUT api/event/{id}
// @desc Update event details
// @access Public
exports.update = async function (req, res) {
    try {
        const update = req.body;
        const id = req.params.id;
        const userId = req.user._id;

        const event = await Event.findOneAndUpdate({_id: id, userId}, {$set: update}, {new: true});

        if (!event) return res.status(401).json({message: 'Event does not exist'});

        //if there is no image, return success message
        if (!req.file) return res.status(200).json({event, message: 'Event has been updated'});

        //Attempt to upload to cloudinary
        const result = await uploader(req);
        const event_ = await Event.findOneAndUpdate({_id: id, userId}, {$set: {image: result.url}}, {new: true});

        res.status(200).json({event: event_, message: 'Event has been updated'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

// @route DESTROY api/event/{id}
// @desc Delete Event
// @access Public
exports.destroy = async function (req, res) {
    try {
        const id = req.params.id;
        const userId = req.user._id;

        const event = await Event.findOneAndDelete({_id: id, userId});

        if (!event) return res.status(401).json({message: "Event does not exist or you don't have the required permission."});

        res.status(200).json({message: 'Event has been deleted'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};


/**
 * Seed the database -  //For testing purpose only
 */
exports.seed = async function (req, res) {

    try {
        let ids = [];
        let events = [];

        for (let i = 0; i < 5; i++) {
            const password = '_' + Math.random().toString(36).substr(2, 9); //generate a random password
            let newUser = new User({
                email: faker.internet.email(),
                password,
                firstName: faker.name.firstName(),
                lastName: `${faker.name.lastName()}`,
                isVerified: true
            });

            const user = await newUser.save();
            ids.push(user._id)
        }


        for (let i = 0; i < ids.length; i++) {
            //Create 5 events for each user
            for (let j = 0; j < 5; j++) {
                const newEvent = new Event({
                    name: faker.lorem.word(),
                    location: faker.address.streetName(),
                    address: `${faker.address.streetAddress()} ${faker.address.secondaryAddress()}`,
                    start_date: faker.date.future(),
                    description: faker.lorem.text(),
                    image: faker.image.nightlife(),
                    userId: ids[i]
                });

                let event = await newEvent.save();
                events.push(event);
            }
        }

        res.status(200).json({ids, events, message: 'Database seeded!'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }

};