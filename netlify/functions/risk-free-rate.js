'use strict';

const { adaptVercelHandler } = require("../lib/vercel-adapter");
const vercelHandler = require("../../api/risk-free-rate");

exports.handler = adaptVercelHandler(vercelHandler);
