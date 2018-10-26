/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
 var _ = require("lodash");
var Q = require("q");
var pluralize = require("pluralize");
var ODataModelBuilder = require("@themost/data/odata").ODataModelBuilder;
var EdmMapping = require("@themost/data/odata").EdmMapping;
var LangUtils = require("@themost/common/utils").LangUtils;
var DataQueryable = require("@themost/data/data-queryable").DataQueryable;
var parseBoolean = require('@themost/common/utils').LangUtils.parseBoolean;
var HttpNotFoundError = require('@themost/common/errors').HttpNotFoundError;
var HttpBadRequestError = require('@themost/common/errors').HttpBadRequestError;
var HttpMethodNotAllowedError = require('@themost/common/errors').HttpMethodNotAllowedError;

/**
 * Interface for options that may be passed to bindEntitySet middleware.
 *
 * @interface BindEntitySetOptions
 */

/**
 * Gets or sets the name of the route parameter that holds the name of the entity set to bind
 * @property
 * @name BindEntitySetOptions#from
 * @returns string
 */
 
 /**
 * Interface for options that may be passed to middlewares that handles requests against entity sets.
 *
 * @interface EntitySetOptions
 */

/**
 * Gets or sets the name of the entity set
 * @property
 * @name EntitySetOptions#entitySet
 * @returns string
 */
 
 /**
 * Gets or sets the name of the route parameter that holds the name of an entity set action
 * @property
 * @name EntitySetOptions#entityActionFrom
 * @returns string
 */
 
 /**
 * Gets or sets the name of the route parameter that holds the name of an entity set function
 * @property
 * @name EntitySetOptions#entityFunctionFrom
 * @returns string
 */
 
 /**
 * Interface for options that may be passed to middlewares that handles requests against entities.
 *
 * @interface EntityOptions
 */

/**
 * Gets or sets the name of the entity set
 * @property
 * @name EntityOptions#entitySet
 * @returns string
 */
 
 /**
 * Gets or sets the name of the route parameter that holds the identifier of the entity
 * @property
 * @name EntityOptions#from
 * @returns string
 */
 
 /**
 * Gets or sets the name of the route parameter that holds the entity's navigation property
 * @property
 * @name EntityOptions#navigationPropertyFrom
 * @returns string
 */
 
 /**
 * Gets or sets the name of the route parameter that holds the name of an entity action
 * @property
 * @name EntityOptions#entityActionFrom
 * @returns string
 */
 
 /**
 * Gets or sets the name of the route parameter that holds the name of an entity function
 * @property
 * @name EntityOptions#entityFunctionFrom
 * @returns string
 */
 
 /**
 * Binds current request to an entitySet for further processing
 * @param {BindEntitySetOptions=} options
 * @returns {Function}
 */
function bindEntitySet(options) {
    // assign defaults
    var opts = Object.assign({
        from: 'entitySet'
    }, options);
    
    return function(req, res, next) {
        /**
         * @type {ODataModelBuilder}
         */
        var builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        if (typeof builder === 'undefined') {
            return next(new TypeError('Application model builder cannot be empty at this context'));
        }
        /**
         * @type {EntitySetConfiguration}
         */
        var thisEntitySet = builder.getEntitySet(req.params[opts.from]);
        if (typeof thisEntitySet === 'undefined') {
            return next();
        }
       /**
        * Gets or sets an entity set configuration
        * @name entitySet
        * @type {EntitySetConfiguration}
        * @memberOf req
        */ 
        req.entitySet = thisEntitySet;
        return next();
    };
}

function tryBindEntitySet(req, entitySet) {
    if (typeof req.context === 'undefined') {
        return;
    }
    /**
     * @type {ODataModelBuilder}
     */
    var builder = req.context.getApplication().getStrategy(ODataModelBuilder);
    if (typeof builder === 'undefined') {
        return;
    }
    /**
     * @type {EntitySetConfiguration}
     */
    return builder.getEntitySet(entitySet);
}

/**
 * Extends a data queryable based on an given source data queryable
 * @param {DataQueryable} target
 * @param {DataQueryable} source
 */
function extendQueryable(target, source) {
    if (source.query.$select) {
        target.query.$select = source.query.$select;
    }
    if (source.$view) {
        target.$view = source.$view;
    }
    if (source.$expand) {
        target.$expand = (target.$expand || []).concat(source.$expand);
    }
    if (source.query.$expand) {
        var targetExpand = [];
        if (_.isArray(target.query.$expand)) {
            targetExpand = target.query.$expand;
        }
        else if (typeof target.query.$expand === 'object') {
            targetExpand.push(target.query.$expand);
        }
        var sourceExpand = [].concat(source.query.$expand);

        var res = _.filter(sourceExpand, function(x) {
            return typeof _.find(targetExpand, function(y) {
                return y.$entity.name === x.$entity.name;
            }) === 'undefined';
        });
        target.query.$expand = targetExpand.concat(res);
    }
    if (source.query.$group) {
        target.query.$group = source.query.$group;
    }
    if (source.query.$order) {
        target.query.$order = source.query.$order;
    }
    if (source.query.$prepared) {
        target.query.$where = source.query.$prepared;
    }
    if (source.query.$skip) {
        target.query.$skip = source.query.$skip;
    }
    if (source.query.$take) {
        target.query.$take = source.query.$take;
    }
    return target;
}

/**
 * Handles incoming GET requests against an entity set e.g. GET /api/people/
  * @param {EntitySetOptions=} options
 * @returns {Function}
 */
function getEntitySet(options) {
    
    // assign defaults
    var opts = Object.assign({}, options);
    
    return function(req, res, next) {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (typeof req.entitySet === 'undefined') {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        // if entity set is undefined do nothing
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * Gets the data model for this entity set
         * @type {DataModel}
         */ 
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        thisModel.filter(req.query).then(function(q) {
            return q.getList().then(function(result) {
                return res.json(result);
            });
        }).catch(function(err) {
            return next(err);
        });
    };
}

/**
 * Handles incoming POST or PUT requests against an entity set e.g. POST /api/people/
 * @param {EntitySetOptions=} options
 * @returns {Function}
 */
function postEntitySet(options) {
        
    // assign defaults
    var opts = Object.assign({}, options);
        
    return function(req, res, next) {
        
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (typeof req.entitySet === 'undefined') {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        // if entity set is undefined exit
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * Gets the data model for this entity set
         * @type {DataModel}
         */ 
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        if (typeof req.body === 'undefined') {
            return next(new HttpBadRequestError());
        }
        thisModel.save(req.body).then(function() {
            return res.json(req.body);
        }).catch(function(err) {
            return next(err);
        });
    };
}

/**
 * Handles incoming DELETE requests against an entity set e.g. DELETE /api/people/
  * @param {EntitySetOptions=} options
 * @returns {Function}
 */
function deleteEntitySet(options) {
    
    // assign defaults
    var opts = Object.assign({}, options);

    return function(req, res, next) {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (typeof req.entitySet === 'undefined') {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * Gets the data model for this entity set
         * @type {DataModel}
         */ 
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        if (typeof req.body === 'undefined') {
            return next(new HttpBadRequestError());
        }
        thisModel.remove(req.body).then(function() {
            return res.json(req.body);
        }).catch(function(err) {
            return next(err);
        });
    };
}

/**
 * Handles incoming GET requests against an entity e.g. GET /api/people/101/
  * @param {EntityOptions=} options
 * @returns {Function}
 */
function getEntity(options) {
    
    // assign defaults
    var opts = Object.assign({
        from: 'id'
    }, options);
    
    return function(req, res, next) {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (typeof req.entitySet === 'undefined') {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        // if entity set is empty do nothing
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        // pick query options (only $select or $expand)
        var filter = _.pick(req.query, ['$select', '$expand']);
        // apply filter
        thisModel.filter(filter).then(function(q) {
            // set query for item
            return q.where(thisModel.primaryKey).equal(req.params[opts.from]).getItem().then(function(value) {
                // if value is undefined
                if (typeof value === 'undefined') {
                    // send not found
                    return next();
                }
                // othwerwise return object
                return res.json(value);
            });
        }).catch(function(err) {
            return next(err);
        });
    };
}

/**
 * Handles incoming DELETE requests against an entity e.g. GET /api/people/101/
  * @param {EntityOptions=} options
 * @returns {Function}
 */
function deleteEntity(options) {
    
    // assign defaults
    var opts = Object.assign({
        from: 'id'
    }, options);
    return function(req, res, next) {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (typeof req.entitySet === 'undefined') {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        thisModel.where(thisModel.primaryKey).equal(req.params[opts.from]).count().then(function(value) {
            if (value === 0) {
                return res.status(404).send();
            }
            // construct a native object
            var obj = {
                "id": req.params[opts.from]
            };
            //try to delete
            return thisModel.remove(obj).then(function() {
                return res.json(obj);
            });
        }).catch(function(err) {
            return next(err);
        });
    };
}

/**
 * Handles incoming POST or PUT requests against an entity e.g. POST /api/people/101/
  * @param {EntityOptions=} options
 * @returns {Function}
 */
function postEntity(options) {
    
    // assign defaults
    var opts = Object.assign({
        from: 'id'
    }, options);
    return function(req, res, next) {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (typeof req.entitySet === 'undefined') {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        // validate primary key
        var key = req.params[opts.from];
        if (typeof key === 'undefined' || key === null) {
            return next(new HttpBadRequestError('Object identifier cannot be emty at this context'));
        }
        thisModel.where(thisModel.primaryKey).equal(key).count().then(function(value) {
            if (value === 0) {
                return res.status(404).send();
            }
            // validate req.body
            if (typeof req.body === 'undefined') {
                return next(new HttpBadRequestError('Request body vannot be empty'));
            }
            // clone body
            var obj = Object.assign({}, req.body);
            // set identifier
            obj[thisModel.primaryKey] = key;
            // try to save
            return thisModel.save(obj).then(function() {
                return res.json(obj);
            });
        }).catch(function(err) {
            return next(err);
        });
    };
}

/**
 * Handles incoming GET requests against an entity's navigation property e.g. GET /api/people/101/address
  * @param {EntityOptions=} options
 * @returns {Function}
 */
function getEntityNavigationProperty(options) {
    
    // assign defaults
    var opts = Object.assign({
        from: 'id',
        navigationPropertyFrom: 'navigationProperty'
    }, options);
    
    return function(req, res, next) {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (typeof req.entitySet === 'undefined') {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * get current model builder
         * @type {ODataModelBuilder}
         */
        var builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        /**
         * get current data model
         * @type {DataModel}
         */
        var thisModel = req.context.model(req.entitySet.entityType.name);
        // get navigation property param
        var navigationProperty = req.params[opts.navigationPropertyFrom];

        if (typeof thisModel === 'undefined') {
            return next();
        }
        thisModel.where(thisModel.primaryKey).equal(req.params[opts.from]).select(thisModel.primaryKey).getTypedItem().then(function(obj) {
            if (typeof obj === 'undefined') {
                return res.status(404).send();
            }
            //check if entity set has a function with the same name
            var action = req.entitySet.entityType.hasFunction(navigationProperty);
            if (action) {
                var returnsCollection = _.isString(action.returnCollectionType);
                var returnModel = req.context.model(action.returnType || action.returnCollectionType);
                // find method
                var memberFunc = EdmMapping.hasOwnFunction(obj, action.name);
                if (memberFunc) {
                    var funcParameters = [];
                    _.forEach(action.parameters, function(x) {
                        if (x.name !== 'bindingParameter') {
                            funcParameters.push(LangUtils.parseValue(req.params[x.name]));
                        }
                    });
                    return Q.resolve(memberFunc.apply(obj, funcParameters)).then(function(result) {
                        if (result instanceof DataQueryable) {
                            if (_.isNil(returnModel)) {
                                return next(new HttpNotFoundError("Result Entity not found"));
                            }
                            var returnEntitySet = builder.getEntityTypeEntitySet(returnModel.name);
                            if (_.isNil(returnEntitySet)) {
                                returnEntitySet = builder.getEntity(returnModel.name);
                            }
                            var filter = Q.nbind(returnModel.filter, returnModel);
                            //if the return value is a single instance
                            if (!returnsCollection) {
                                //pass context parameters (only $select and $expand)
                                var params = _.pick(req.query, [
                                    "$select",
                                    "$expand"
                                ]);
                                //filter with parameters
                                return filter(params).then(function(q) {
                                    //get item
                                    return q.getItem().then(function(result) {
                                        if (_.isNil(result)) {
                                            return next(new HttpNotFoundError());
                                        }
                                        //return result
                                        return res.json(result);
                                    });
                                });
                            }
                            //else if the return value is a collection
                            return filter(_.extend({
                                "$top": 25
                            }, req.query)).then(function(q) {
                                var count = req.query.hasOwnProperty('$inlinecount') ? parseBoolean(req.query.$inlinecount) : (req.query.hasOwnProperty('$count') ? parseBoolean(req.query.$count) : false);
                                var q1 = extendQueryable(result, q);
                                if (count) {
                                    return q1.getList().then(function(result) {
                                        //return result
                                        return res.json(result);
                                    });
                                }
                                return q1.getItems().then(function(result) {
                                    //return result
                                    return res.json(result);
                                });
                            });
                        }
                        return res.json(result);
                    });
                }
            }
            //get primary key
            var key = obj[thisModel.primaryKey];
            //get mapping
            var mapping = thisModel.inferMapping(navigationProperty);
            //get count parameter
            var count = req.query.hasOwnProperty('$inlinecount') ? parseBoolean(req.query.$inlinecount) : (req.query.hasOwnProperty('$count') ? parseBoolean(req.query.$count) : false);
            if (_.isNil(mapping)) {
                //try to find associated model
                //get singular model name
                var otherModelName = pluralize.singular(navigationProperty);
                //search for model with this name
                var otherModel = req.context.model(otherModelName);
                if (otherModel) {
                    var otherFields = _.filter(otherModel.attributes, function(x) {
                        return x.type === thisModel.name;
                    });
                    if (otherFields.length > 1) {
                        return next(new HttpMethodNotAllowedError("Multiple associations found"));
                    }
                    else if (otherFields.length === 1) {
                        var otherField = otherFields[0];
                        mapping = otherModel.inferMapping(otherField.name);
                        if (mapping && mapping.associationType === 'junction') {
                            var attr;
                            //search model for attribute that has an association of type junction with child model
                            if (mapping.parentModel === otherModel.name) {
                                attr = _.find(otherModel.attributes, function(x) {
                                    return x.name === otherField.name;
                                });
                            }
                            else {
                                attr = _.find(thisModel.attributes, function(x) {
                                    return x.type === otherModel.name;
                                });
                            }
                            if (attr) {
                                thisModel = attr.name;
                                mapping = thisModel.inferMapping(attr.name);
                            }
                        }
                    }
                }
                if (_.isNil(mapping)) {
                    return next(new HttpNotFoundError("Association not found"));
                }
            }
            if (mapping.associationType === 'junction') {
                /**
                 * @type {DataQueryable}
                 */
                var junction = obj.property(navigationProperty);
                return Q.nbind(junction.model.filter, junction.model)(req.query).then(function(q) {
                    //merge properties
                    if (q.query.$select) {
                        junction.query.$select = q.query.$select;
                    }
                    if (q.$expand) {
                        junction.$expand = q.$expand;
                    }
                    if (q.query.$group) {
                        junction.query.$group = q.query.$group;
                    }
                    if (q.query.$order) {
                        junction.query.$order = q.query.$order;
                    }
                    if (q.query.$prepared) {
                        junction.query.$where = q.query.$prepared;
                    }
                    if (q.query.$skip) {
                        junction.query.$skip = q.query.$skip;
                    }
                    if (q.query.$take) {
                        junction.query.$take = q.query.$take;
                    }
                    if (count) {
                        return junction.getList().then(function(result) {
                            return res.json(result);
                        });
                    }
                    else {
                        return junction.getItems().then(function(result) {
                            return res.json(result);
                        });
                    }
                });
            }
            else if (mapping.parentModel === thisModel.name && mapping.associationType === 'association') {
                //get associated model
                var associatedModel = req.context.model(mapping.childModel);
                if (_.isNil(associatedModel)) {
                    return next(new HttpNotFoundError("Associated model not found"));
                }
                return Q.nbind(associatedModel.filter, associatedModel)(_.extend({
                    "$top": 25
                }, req.query)).then(function(q) {
                    if (count) {
                        return q.where(mapping.childField).equal(key).getList().then(function(result) {
                            return res.json(result);
                        });
                    }
                    else {
                        return q.where(mapping.childField).equal(key).getItems().then(function(result) {
                            return res.json(result);
                        });
                    }
                });
            }
            else if (mapping.childModel === thisModel.name && mapping.associationType === 'association') {
                //get associated model
                var parentModel = req.context.model(mapping.parentModel);
                if (_.isNil(parentModel)) {
                    return next(new HttpNotFoundError("Parent associated model not found"));
                }
                return thisModel.where(thisModel.primaryKey).equal(obj.id).select(thisModel.primaryKey, navigationProperty).expand(navigationProperty).getItem().then(function(result) {
                    return res.json(result[navigationProperty]);
                });
            }
            else {
                return next(new HttpNotFoundError());
            }
        }).catch(function(err) {
            return next(err);
        });
    };
}

/**
 * Handles incoming GET requests against an entity's action  e.g. GET /api/people/me/
  * @param {EntityOptions=} options
 * @returns {Function}
 */
function getEntitySetFunction(options) {
    // assign defaults
    var opts = Object.assign({
        entityFunctionFrom: 'entityFunction',
        navigationPropertyFrom: 'navigationProperty'
    }, options);
    return function(req, res, next) {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (typeof req.entitySet === 'undefined') {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        
        var model = req.context.model(req.entitySet.entityType.name);
    if (_.isNil(model)) {
        return next(new HttpNotFoundError("Entity not found"));
    }
    var entityFunction = req.params[opts.entityFunctionFrom];
    var navigationProperty = req.params[opts.navigationPropertyFrom];
    /**
     * get current model builder
     * @type {ODataModelBuilder}
     */
    var builder = req.context.getApplication().getStrategy(ODataModelBuilder);
    var func = req.entitySet.entityType.collection.hasFunction(entityFunction);
    if (func) {
        //get data object class
        var DataObjectClass = model.getDataObjectType();
        var staticFunc = EdmMapping.hasOwnFunction(DataObjectClass,entityFunction);
        if (staticFunc) {
            return Q.resolve(staticFunc(req.context)).then(function(result) {
                var returnsCollection = _.isString(func.returnCollectionType);
                var returnModel = req.context.model(func.returnType || func.returnCollectionType);
                if (_.isNil(returnModel)) {
                    return Q.reject(new HttpNotFoundError("Result Entity not found"));
                }
                var returnEntitySet = builder.getEntityTypeEntitySet(returnModel.name);
                if (result instanceof DataQueryable) {
                    var filter = Q.nbind(returnModel.filter, returnModel);
                    if (!returnsCollection) {
                        //pass context parameters (if navigationProperty is empty)
                        var params = {};
                        if (_.isNil(navigationProperty)) {
                            params = _.pick(req.query, [
                                "$select",
                                "$expand"
                            ]);
                        }
                        return filter(params).then(function(q) {
                            //do not add context params
                            var q1 = extendQueryable(result, q);
                            return q1.getItem().then(function(result) {
                                if (_.isNil(result)) {
                                    return next(new HttpNotFoundError());
                                }
                                if (_.isString(navigationProperty)) {
                                    //set internal identifier for object
                                    req.params._id = result[returnModel.primaryKey];
                                    //set internal navigation property
                                    req.params._navigationProperty = navigationProperty;
                                    // call navigation property middleware
                                    return getEntityNavigationProperty({
                                        entitySet: returnEntitySet.name,
                                        from: '_id',
                                        navigationPropertyFrom:'_navigationProperty'
                                    })(req, res, next);
                                }
                                return res.json(result);
                            });
                        });
                    }
                    if (typeof navigationProperty !== 'undefined') {
                        return next(new HttpBadRequestError());
                    }
                    return filter( _.extend({
                            "$top": 25
                        },req.query)).then(function(q) {
                        var count = req.query.hasOwnProperty('$inlinecount') ? 
                            parseBoolean(req.query.$inlinecount) : (req.query.hasOwnProperty('$count') ? 
                            parseBoolean(req.query.$count) : false);
                        var q1 = extendQueryable(result, q);
                        if (count) {
                            return q1.getList().then(function(result) {
                                return res.json(result);
                            });
                        }
                        return q1.getItems().then(function(result) {
                            return res.json(result);
                        });
                    });
                }
                if (_.isNil(navigationProperty)) {
                    if (returnsCollection) {
                        return res.json(result);
                    }
                    else {
                        if (Array.isArray(result)) {
                            // send no content if empty
                            if (typeof result[0] === 'undefined') {
                                return res.send(204);
                            }
                            // get first item only
                            return res.json(result[0]);
                        }
                        // send no content if empty
                        if (typeof result === 'undefined') {
                                return res.send(204);
                            }
                        return res.json(result);
                    }
                }
                if (_.isNil(returnEntitySet)) {
                    return next(new HttpNotFoundError("Result EntitySet not found"));
                }
                //set internal identifier for object
                req.params._id = result[returnModel.primaryKey];
                //set internal navigation property
                req.params._navigationProperty = navigationProperty;
                return getEntityNavigationProperty({
                    entitySet: returnEntitySet.name,
                    from: '_id',
                    navigationPropertyFrom:'_navigationProperty'
                })(req, res, next);
            });
        }
        // an entity set function method with the specified name was not found, throw error
        return next(new Error('The specified entity set function cannot be found'));
    }
    // an entity set function was not found, continue
    return next();    
    };
}

/**
 * Handles incoming POST requests against an entity set action  e.g. GET /api/people/me/
  * @param {EntityOptions=} options
 * @returns {Function}
 */
function postEntitySetAction(options) {
    // assign defaults
    var opts = Object.assign({
        entityActionFrom: 'entityAction'
    }, options);
    return function(req, res, next) {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (typeof req.entitySet === 'undefined') {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        var model = req.context.model(req.entitySet.entityType.name);
        if (_.isNil(model)) {
            return next(new HttpNotFoundError("Entity not found"));
        }
        var entityAction = req.params[opts.entityActionFrom];
        var action = req.entitySet.entityType.collection.hasAction(entityAction);
        if (action) {
            //get data object class
            var DataObjectClass = model.getDataObjectType();
            var actionFunc = EdmMapping.hasOwnFunction(DataObjectClass,entityAction);
            if (typeof actionFunc !== 'function') {
                return next(new Error('Invalid entity set configuration. The specified action cannot be found'))
            }
            var actionParameters = [];
            var parameters = _.filter(action.parameters, function(x) {
                return x.name !== 'bindingParameter';
            });
            // if parameters must be included in body
            if (parameters.length) {
                // validate request body
                if (typeof req.body === 'undefined') {
                    // throw bad request if body is missing
                    return next(new HttpBadRequestError('Request body cannot be empty'));
                }
            }
            // add context as the first parameter
            actionParameters.push(req.context);
            // todo: pass request body as parameter
            // add other parameters by getting request body attributes
            _.forEach(parameters, function(x) {
                actionParameters.push(req.body[x.name]);
            });
            // invoke action
            return Q.resolve(actionFunc.call(null, actionParameters)).then(function(result) {
                // check if action returns a collection of object
                var returnsCollection = _.isString(action.returnCollectionType);
                if (result instanceof DataQueryable) {
                    // todo:: validate return collection type and pass system query options ($filter, $expand, $select etc)
                    if (returnsCollection) {
                        // call DataModel.getItems() instead of DataModel.getList()
                        // an action that returns a collection of objects must always return a native array (without paging parameters)
                        return result.getItems().then(function(finalResult) {
                           return res.json(finalResult); 
                        });
                    }
                    else {
                        // otherwise call DataModel.getItem() to get only the first item of the result set
                        return result.getItem().then(function(finalResult) {
                           return res.json(finalResult); 
                        });
                    }
                }
                if (typeof result === 'undefined') {
                    // return no content
                    return res.status(204).send();
                }
                // return result as native object
                return res.json(result);
            }).catch(function(err) {
                return next(err);
            });
            
        }
        // there is no action with the given name, continue
        return next();
    };
}

module.exports.bindEntitySet = bindEntitySet;
module.exports.getEntitySet = getEntitySet;
module.exports.postEntitySet = postEntitySet;
module.exports.deleteEntitySet = deleteEntitySet;
module.exports.getEntity = getEntity;
module.exports.postEntity = postEntity;
module.exports.deleteEntity = deleteEntity;
module.exports.getEntityNavigationProperty = getEntityNavigationProperty;
module.exports.getEntitySetAction = getEntitySetFunction;
module.exports.postEntitySetAction = postEntitySetAction;