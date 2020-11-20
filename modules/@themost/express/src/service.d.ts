// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {Router, Request, Response} from 'express';

declare const serviceRouter: Router;

// noinspection JSUnusedGlobalSymbols
declare function readStream(stream: ReadableStream): Buffer;


declare interface ExpressRequestContext {
    request: Request,
    response: Response
} 

export {serviceRouter, readStream, ExpressRequestContext};
