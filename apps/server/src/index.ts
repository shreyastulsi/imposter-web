import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { RoomManager } from './game/RoomManager'
import { registerHandlers } from './game/handlers'
import { WORDS } from './data/words'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
})

const manager = new RoomManager(WORDS)

io.on('connection', socket => {
  registerHandlers(io, socket, manager)
})

app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT ?? 3001
httpServer.listen(PORT, () => {
  console.log(`Game server running on :${PORT}`)
})
