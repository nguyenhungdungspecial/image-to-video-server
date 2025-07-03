FROM node:18

# Cài ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Tạo thư mục app và copy code
WORKDIR /app
COPY . .

# Cài dependencies
RUN npm install

# Mở cổng
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
