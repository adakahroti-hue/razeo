#!/bin/bash
cd /home/ubuntu/workspace/apps/razeo || exit 1
rm -f build.log
NODE_OPTIONS=--max-old-space-size=4096 npx vite build > build.log 2>&1
echo "BUILD_EXIT=$?" >> build.log
tail -6 build.log