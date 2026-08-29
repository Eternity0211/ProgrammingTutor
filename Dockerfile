FROM node:22-alpine

WORKDIR /app

COPY package*.json .


COPY . .

RUN npm install


RUN npx prisma generate


EXPOSE 3000

CMD ["npm", "run", "docker:start" ]
