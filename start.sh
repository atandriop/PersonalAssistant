#!/bin/bash
PORT=$(node -p "require('./config.json').port || 4100")
exec npx next dev -p "$PORT"
