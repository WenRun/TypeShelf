## Run RunFonts with Docker (quick test)

### 1) Build
docker build -t runfonts:local .

### 2) Run (needs DATABASE_URL)
docker network create runfonts-net || true

docker run -d --name runfonts-db --network runfonts-net \
  -e POSTGRES_DB=runfonts \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=runfonts \
  -p 5432:5432 \
  postgres:16-alpine

docker run -d --name runfonts --network runfonts-net \
  -e PORT=5000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgres://postgres:runfonts@runfonts-db:5432/runfonts \
  -p 5000:5000 \
  -v $(pwd)/fonts:/app/fonts \
  runfonts:local
