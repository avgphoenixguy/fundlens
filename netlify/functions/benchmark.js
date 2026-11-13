'use strict';

const { adaptVercelHandler } = require("../lib/vercel-adapter");
const vercelHandler = require("../../api/benchmark");

exports.handler = adaptVercelHandler(vercelHandler);
