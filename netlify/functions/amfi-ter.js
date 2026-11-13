'use strict';

const { adaptVercelHandler } = require("../lib/vercel-adapter");
const vercelHandler = require("../../api/amfi-ter");

exports.handler = adaptVercelHandler(vercelHandler);
