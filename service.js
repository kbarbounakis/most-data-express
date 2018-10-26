/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
var express = require('express');
var router = express.Router();

var bindEntitySet = require("./middleware").bindEntitySet;
var getEntitySet = require("./middleware").getEntitySet;
var postEntitySet = require("./middleware").postEntitySet;
var deleteEntitySet = require("./middleware").deleteEntitySet;
var getEntity = require("./middleware").getEntity;
var postEntity = require("./middleware").postEntity;
var deleteEntity = require("./middleware").deleteEntity;
var getEntityNavigationProperty = require("./middleware").getEntityNavigationProperty;
var getEntitySetFunction = require("./middleware").getEntitySetFunction;
var postEntitySetAction = require("./middleware").postEntitySetAction;

/* GET /:entitySet  */
router.get('/:entitySet', bindEntitySet(), getEntitySet());

/* POST /:entitySet insert or update a data object or an array of data objects. */
router.post('/:entitySet', bindEntitySet(), postEntitySet());

/* PUT /:entitySet insert or update a data object or an array of data objects. */
router.put('/:entitySet', bindEntitySet(), postEntitySet());

/* DELETE /:entitySet removes a data object or an array of data objects. */
router.delete('/:entitySet', bindEntitySet(), deleteEntitySet());

/* GET /:entitySet/:entityAction/  */
router.get('/:entitySet/:entityFunction', bindEntitySet(), getEntitySetFunction());

/* POST /:entitySet/:entityAction/  */
router.post('/:entitySet/:entityAction', bindEntitySet(), postEntitySetAction());

/* GET /:entitySet/:entityAction/  */
router.get('/:entitySet/:entityAction/:navigationProperty', bindEntitySet(), getEntitySetFunction());

/* GET /:entitySet/:id  */
router.get('/:entitySet/:id', bindEntitySet(), getEntity());

/* POST /:entitySet/:id posts a data object by id. */
router.post('/:entitySet/:id', bindEntitySet(), postEntity());

/* DELETE /:entitySet/:id deletes a data object by id. */
router.delete('/:entitySet/:id', bindEntitySet(), deleteEntity());

/* GET /:entitySet/:id/:navigationProperty  */
router.get('/:entitySet/:id/:navigationProperty', bindEntitySet(), getEntityNavigationProperty());

module.exports = router;