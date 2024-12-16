FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Construir aplicação
RUN npm run build

# Expor porta
EXPOSE 5173

# Comando para iniciar em desenvolvimento
CMD ["npm", "run", "dev", "--", "--host"] 