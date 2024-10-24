FROM node:latest

WORKDIR /app

# Copy package.json and pnpm-lock.yaml first to leverage Docker cache
# COPY package.json pnpm-lock.yaml ./
COPY . .
RUN rm -rf node_modules

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Make sure bindings.sh is executable
RUN chmod 777 bindings.sh

EXPOSE 5173

# Use shell form of CMD to allow variable expansion and script execution
CMD pnpm run dev
#
# docker build -t bolt:latest .
# docker build --no-cache -t bolt:v0.3.3 .
# docker tag bolt:v0.3.3 makisunwood/bolt:v0.3.3
#
# docker run -p 5173:5173 bolt:latest
# docker push makisunwood/bolt:v0.3.3   
#
