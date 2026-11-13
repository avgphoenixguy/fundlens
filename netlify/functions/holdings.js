'use strict';

const { adaptVercelHandler } = require("../lib/vercel-adapter");
const vercelHandler = require("../../api/holdings");

exports.handler = adaptVercelHandler(vercelHandler);
