#!/bin/bash
PORT="${PORT:-3104}" node --env-file=.env apps/api/src/index.js
