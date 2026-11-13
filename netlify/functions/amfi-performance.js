'use strict';

const { adaptVercelHandler } = require("../lib/vercel-adapter");
const vercelHandler = require("../../api/amfi-performance");

exports.handler = adaptVercelHandler(vercelHandler);
