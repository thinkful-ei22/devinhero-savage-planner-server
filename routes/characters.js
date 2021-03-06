const express = require('express');
const ObjectId = require('mongoose').Types.ObjectId;

//Schema models
const Character = require('../models/character');
const Edge = require('../models/edge');

//Get passport for auth
const passport = require('passport');

//Init router
const router = express.Router();

const newChar = require('../db/seed/newChar.json');

const skillKeys = [
  'athletics',
  'fighting',
  'healing',
  'intimidation',
  'investigation',
  'notice',
  'persuasion',
  'repair',
  'riding',
  'shooting',
  'stealth',
  'streetwise',
  'survival',
  'taunt',
  'throwing',
  'tracking'];

const advanceKeys=[
  'xp',
  'advType',
  'val',
  'val2',
  'edgeId'
];

const attrKeys =[
  'strength',
  'vigor',
  'agility',
  'smarts',
  'spirit'
];

//Authenticate
router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

//GET all
router.get('/', (req, res, next)=>{
  const userId = req.user.id;
  const filter = {userId};


  Character.find(filter)
    .populate('advances.edgeId')
    .then(results =>{
      res.json(results);
    })
    .catch(err =>{
      next(err);
    });
});

//GET by id
router.get('/:id', (req, res, next)=>{
  const id = req.params.id;
  const userId = req.user.id;

  let filter = {_id: id, userId};
  
  Character.findOne(filter)
    .populate('advances.edgeId')
    .then(results =>{
      if(results) res.json(results);
      else next();
    })
    .catch(err =>{
      next(err);
    });
});

//POST new character w/ empty stats
router.post('/', (req, res, next)=>{
  const userId = req.user.id;

  const createChar = Object.assign({}, newChar);
  createChar.userId = userId;

  Character.create(createChar)
    .then(results =>{
      res.location(`${req.originalUrl}/${results.id}`).status(201).json(results);
    })
    .catch(err =>{
      next(err);
    });
});

//PUT update by id
router.put('/:id', (req, res, next)=>{
  const id = req.params.id;
  const userId = req.user.id;

  const updateObj ={$set: {}};
  let hasVal = false;

  if(req.body.hasOwnProperty('name')){
    hasVal=true;
    updateObj.$set['name'] = req.body.name;
  }
  
  if(req.body.hasOwnProperty('initial')){
    //Fetch attribute to set
    if(req.body.initial.hasOwnProperty('attributes') 
          && Object.keys(req.body.initial.attributes).length > 0){

      attrKeys.forEach(key =>{
        if(req.body.initial.attributes.hasOwnProperty(key)){
          hasVal = true;
          updateObj.$set[`initial.attributes.${key}`] = 
                        req.body.initial.attributes[key];
        }
      });
    }
    //Fetch skill to set
    if(req.body.initial.hasOwnProperty('skills')
          && Object.keys(req.body.initial.skills).length > 0){
        
      skillKeys.forEach(key =>{
        if(req.body.initial.skills.hasOwnProperty(key)){
          hasVal = true;
          updateObj.$set[`initial.skills.${key}.val`] = 
                        req.body.initial.skills[key].val;
        }
      });
    }
  }

  if(req.body.hasOwnProperty('advance')){
    //hasVal = true;
    const updateAdvKeys = Object.keys(req.body.advance);
    if( updateAdvKeys.sort().join(',') !== (advanceKeys.sort()).join(',') ){
      const err = new Error('Missing or unknown key in `advance`');
      err.status = 500;
      return next(err);
    }
    hasVal = true;
    const xpIndex = req.body.advance.xp/5 - 1;
    updateObj.$set[`advances.${xpIndex}`] = req.body.advance;
  }
  
  //Nothing to update, don't do it
  if(!hasVal){
    const err = new Error('No valid update fields in request body');
    err.status = 400;
    return next(err);
  }

  //TODO: Validate name

  //TODO: Validate any starting skill/attribute numbers belong to 0, 4, 6, 8, 10, 12

  //TODO: Anything with edges

  const options = {new: true};

  const filter ={_id: id, userId};

  Character.findOneAndUpdate(filter, updateObj, options)
    .populate('advances.edgeId')
    .then(results =>{
      if(results) res.json(results);
      else next();
    })
    .catch(err =>{
      next(err);
    });
});

router.delete('/:id', (req, res, next) => {

  const id = req.params.id;
  const userId = req.user.id;

  if (!ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  const query = {_id: id, userId};

  Character.findOneAndRemove(query)
    .then(results =>{
      if(results)
        res.status(204).end();
      else
        next();
    })
    .catch(err =>{
      next(err);
    });
});


module.exports = router;