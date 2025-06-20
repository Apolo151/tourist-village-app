# Stage 1: Build Stage
# Use an official Node.js runtime as a parent image
FROM node:18-alpine AS build

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production Stage
# Use a smaller, production-ready Node.js image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the node_modules and built application files from the build stage
COPY --from=build /usr/src/app .

# Expose the port your API will run on
EXPOSE 3000

# Define environment variables
ENV NODE_ENV=production

RUN chmod +x entrypoint.sh

# Command to start the backend
CMD ["sh","entrypoint.sh"]
