#! /bin/bash

bun build --compile --minify --target=bun-linux-x64 ./src/index.ts --outfile extralexis-linux-x64
bun build --compile --minify --target=bun-windows-x64 ./src/index.ts --outfile extralexis-windows-x64
bun build --compile --minify --target=bun-darwin-x64 ./src/index.ts --outfile extralexis-macos-x64
bun build --compile --minify --target=bun-darwin-arm64 ./src/index.ts --outfile extralexis-macos-arm64
