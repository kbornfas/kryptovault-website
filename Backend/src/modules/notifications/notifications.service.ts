import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationsService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Set<Socket>> = new Map();

  constructor(private prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    if (!userId) {
      client.disconnect();
      return;
    }

    if (!this.connectedClients.has(userId)) {
      this.connectedClients.set(userId, new Set());
    }
    this.connectedClients.get(userId).add(client);
    client.join(userId);
    console.log(`Client connected: ${client.id} for user: ${userId}`);
  }

  handleDisconnect(client: Socket) {
    for (const [userId, clients] of this.connectedClients.entries()) {
      if (clients.has(client)) {
        clients.delete(client);
        if (clients.size === 0) {
          this.connectedClients.delete(userId);
        }
        console.log(`Client disconnected: ${client.id} for user: ${userId}`);
        break;
      }
    }
  }

  async sendNotification(dto: CreateNotificationDto) {
    try {
      const payload = plainToInstance(CreateNotificationDto, dto);

      await validateOrReject(payload);

      // Store notification in database
      const notification = await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          read: false,
        },
      });

      // Send real-time notification via WebSocket
      if (this.connectedClients.has(payload.userId)) {
        this.server.to(payload.userId).emit('notification', notification);
      }

      return notification;
    } catch (error) {
      if (Array.isArray(error) && error.length > 0) {
        const message = Object.values(error[0].constraints ?? {})[0];
        throw new BadRequestException(message ?? 'Invalid notification payload');
      }
      throw error;
    }
  }

  async getUserNotifications(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      return await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to fetch notifications');
    }
  }

  async markAsRead(notificationId: string) {
    try {
      if (!notificationId) {
        throw new BadRequestException('Notification ID is required');
      }

      const notification = await this.prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      return notification;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to mark notification as read');
    }
  }

  async markAllAsRead(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      return await this.prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to mark notifications as read');
    }
  }
}