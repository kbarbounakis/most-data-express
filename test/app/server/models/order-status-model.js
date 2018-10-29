import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';

/**
 * @class
 
 * @property {number} id
 * @property {string} name
 * @property {string} alternateName
 * @property {string} description
 * @property {string} color
 * @augments {DataObject}
 */
@EdmMapping.entityType('OrderStatus')
class OrderStatus extends DataObject {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = OrderStatus;